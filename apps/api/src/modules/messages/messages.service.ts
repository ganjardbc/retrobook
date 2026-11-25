import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ChatFriend, ChatMessage, Conversation, Paged } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { VisibilityService } from '../visibility/visibility.service'
import { MAX_MESSAGE_LENGTH } from './dto/messages.dto'

const userSummary = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isBot: true,
} satisfies Prisma.UserSelect

type Row = {
  id: number
  senderId: number
  receiverId: number
  content: string
  readAt: Date | null
  createdAt: Date
}
const toDto = (r: Row): ChatMessage => ({
  id: r.id,
  senderId: r.senderId,
  receiverId: r.receiverId,
  content: r.content,
  readAt: r.readAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
})

const noUser = () => new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')

/**
 * Chat 1-ke-1 (CHT-01). Hanya antar teman ACCEPTED yang tidak saling blokir; pemeriksaan dilakukan di
 * server untuk setiap permintaan, REST maupun socket (BR-11). Bukan teman, diblokir, BANNED, terhapus,
 * atau tidak ada: 404 yang sama.
 */
@Injectable()
export class MessagesService {
  /**
   * Idempotensi `clientId`: hasil pengiriman disimpan sebentar di memori (sebagai promise supaya dua kirim
   * serentak berbagi satu hasil). shortcut: hanya satu instance dan hilang saat restart; naikkan menjadi
   * kolom `client_id` UNIQUE bila ada lebih dari satu instance (R-06).
   */
  private readonly recent = new Map<string, { at: number; result: Promise<ChatMessage> }>()
  /** Waktu `typing: true` terakhir per pasangan (pengirim:penerima) untuk batas satu per detik. */
  private readonly typingAt = new Map<string, number>()
  private static readonly TTL_MS = 10 * 60_000
  private static readonly MAX_KEYS = 5000

  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Kirim pesan. Pengulangan `clientId` yang sama mengembalikan pesan yang sama (`duplicate: true`). */
  async send(
    senderId: number,
    toUserId: number,
    rawContent: string,
    clientId?: string,
  ): Promise<{ message: ChatMessage; duplicate: boolean }> {
    const content = rawContent.trim()
    if (!content) throw new AppException(400, 'VALIDATION_FAILED', 'Pesan tidak boleh kosong')
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Pesan maksimal 2.000 karakter')
    }
    await this.assertPartner(senderId, toUserId)

    if (!clientId)
      return { message: await this.create(senderId, toUserId, content), duplicate: false }

    this.prune()
    const key = `${senderId}:${clientId}`
    const hit = this.recent.get(key)
    if (hit) return { message: await hit.result, duplicate: true }
    const result = this.create(senderId, toUserId, content)
    this.recent.set(key, { at: Date.now(), result })
    try {
      return { message: await result, duplicate: false }
    } catch (e) {
      this.recent.delete(key) // gagal: boleh dicoba lagi dengan clientId yang sama
      throw e
    }
  }

  /** Riwayat dengan satu user: terbaru dulu, `cursor` menuju pesan yang lebih lama. */
  async history(
    viewerId: number,
    otherId: number,
    limit: number,
    cursor?: number,
  ): Promise<Paged<ChatMessage>> {
    await this.assertPartner(viewerId, otherId)
    const state = await this.prisma.conversationState.findUnique({
      where: { userId_peerId: { userId: viewerId, peerId: otherId } },
    })
    const rows = await this.prisma.message.findMany({
      where: {
        deletedAt: null,
        // Clear chat: pesan sebelum waktu bersih tidak tampil lagi bagi pemiliknya.
        ...(state ? { createdAt: { gt: state.clearedAt } } : {}),
        ...this.between(viewerId, otherId),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    const page = rows.slice(0, limit)
    return {
      items: page.map(toDto),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  /** Tandai semua pesan dari `fromId` sebagai terbaca; memberi tahu pengirim bila ada yang berubah. */
  async markRead(viewerId: number, fromId: number): Promise<{ updated: number }> {
    await this.assertPartner(viewerId, fromId)
    const where = { senderId: fromId, receiverId: viewerId, readAt: null, deletedAt: null }
    const last = await this.prisma.message.aggregate({ where, _max: { id: true } })
    const upTo = last._max.id
    if (upTo === null) return { updated: 0 }
    const { count } = await this.prisma.message.updateMany({
      where: { ...where, id: { lte: upTo } },
      data: { readAt: new Date() },
    })
    if (count > 0)
      this.realtime.emitToUser(fromId, 'message:read', { byUserId: viewerId, upToMessageId: upTo })
    return { updated: count }
  }

  /** Percakapan dengan teman saat ini: pesan terakhir dan jumlah belum dibaca, terbaru dulu. */
  async conversations(
    viewerId: number,
    limit: number,
    cursor?: number,
  ): Promise<Paged<Conversation>> {
    const friends = await this.friendIds(viewerId)
    if (friends.length === 0) return { items: [], nextCursor: null }

    // Satu baris per lawan bicara: id pesan terbaru; MySQL tidak punya DISTINCT ON, jadi GROUP BY.
    const ids = Prisma.join(friends)
    const latest = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      SELECT MAX(m.id) AS id FROM messages m
      LEFT JOIN conversation_states cs
        ON cs.user_id = ${viewerId}
       AND cs.peer_id = IF(m.sender_id = ${viewerId}, m.receiver_id, m.sender_id)
      WHERE m.deleted_at IS NULL
        AND (cs.cleared_at IS NULL OR m.created_at > cs.cleared_at)
        AND ((m.sender_id = ${viewerId} AND m.receiver_id IN (${ids}))
          OR (m.receiver_id = ${viewerId} AND m.sender_id IN (${ids})))
      GROUP BY IF(m.sender_id = ${viewerId}, m.receiver_id, m.sender_id)
      ${cursor ? Prisma.sql`HAVING MAX(m.id) < ${cursor}` : Prisma.empty}
      ORDER BY MAX(m.id) DESC
      LIMIT ${limit + 1}`)
    const page = latest.slice(0, limit).map((r) => Number(r.id))
    if (page.length === 0) return { items: [], nextCursor: null }

    const [rows, unread] = await Promise.all([
      this.prisma.message.findMany({
        where: { id: { in: page } },
        orderBy: { id: 'desc' },
        include: { sender: { select: userSummary }, receiver: { select: userSummary } },
      }),
      this.prisma.message.groupBy({
        by: ['senderId'],
        where: { receiverId: viewerId, readAt: null, deletedAt: null, senderId: { in: friends } },
        _count: { _all: true },
      }),
    ])
    const unreadBy = new Map(unread.map((u) => [u.senderId, u._count._all]))
    return {
      items: rows.map((r) => {
        const other = r.senderId === viewerId ? r.receiver : r.sender
        return { user: other, lastMessage: toDto(r), unreadCount: unreadBy.get(other.id) ?? 0 }
      }),
      nextCursor: latest.length > limit ? page[page.length - 1]! : null,
    }
  }

  /**
   * CHT-02: teman untuk sidebar chat. Online dulu, lalu nama; sampai 200 teman (sidebar menyaring sendiri).
   * Teman BANNED, terhapus, atau terblokir tidak ikut (aturan terpusat).
   */
  async chatFriends(viewerId: number): Promise<{ items: ChatFriend[] }> {
    const users = await this.prisma.user.findMany({
      where: { AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)] },
      orderBy: { displayName: 'asc' },
      take: 200,
      select: { ...userSummary, lastSeenAt: true },
    })
    if (users.length === 0) return { items: [] }
    const ids = users.map((u) => u.id)
    const hidden = await this.hiddenPeers(viewerId, ids)
    const [online, unread] = await Promise.all([
      this.realtime.onlineClients(ids),
      this.prisma.message.groupBy({
        by: ['senderId'],
        where: { receiverId: viewerId, readAt: null, deletedAt: null, senderId: { in: ids } },
        _count: { _all: true },
      }),
    ])
    const unreadBy = new Map(unread.map((u) => [u.senderId, u._count._all]))
    const items = users.map(({ lastSeenAt, ...user }) => ({
      user,
      online: online.has(user.id),
      // Hanya teman ACCEPTED yang sampai sini (visibilitas pusat); dipakai label "24m" di sidebar.
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
      client: online.get(user.id) ?? null,
      unreadCount: unreadBy.get(user.id) ?? 0,
      hidden: hidden.has(user.id),
    }))
    // sort stabil: urutan nama dari query dipertahankan di dalam kelompok online dan offline
    return { items: [...items.filter((i) => i.online), ...items.filter((i) => !i.online)] }
  }

  /**
   * Clear chat: riwayat sampai sekarang disembunyikan dari saya saja; lawan bicara tidak terpengaruh.
   * Pesan masuk yang belum dibaca ikut dianggap terbaca (tanpa memberi tahu pengirim) supaya badge tidak
   * menghitung pesan yang sudah tidak tampil.
   */
  async clear(viewerId: number, otherId: number): Promise<void> {
    await this.assertPartner(viewerId, otherId)
    await this.setState(viewerId, otherId, false)
  }

  /** Hapus sesi: seperti clear, ditambah percakapan hilang dari daftar Messages sampai ada pesan baru. */
  async remove(viewerId: number, otherId: number): Promise<void> {
    await this.assertPartner(viewerId, otherId)
    await this.setState(viewerId, otherId, true)
  }

  private async setState(viewerId: number, otherId: number, hide: boolean) {
    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.conversationState.upsert({
        where: { userId_peerId: { userId: viewerId, peerId: otherId } },
        create: { userId: viewerId, peerId: otherId, clearedAt: now, hiddenAt: hide ? now : null },
        update: { clearedAt: now, hiddenAt: hide ? now : null },
      }),
      this.prisma.message.updateMany({
        where: { senderId: otherId, receiverId: viewerId, readAt: null, deletedAt: null },
        data: { readAt: now },
      }),
    ])
  }

  /** Teman yang sesinya dihapus dan belum ada pesan baru sesudahnya. */
  private async hiddenPeers(viewerId: number, peerIds: number[]): Promise<Set<number>> {
    const states = await this.prisma.conversationState.findMany({
      where: { userId: viewerId, peerId: { in: peerIds }, hiddenAt: { not: null } },
    })
    const revived = await Promise.all(
      states.map((s) =>
        this.prisma.message.count({
          where: {
            deletedAt: null,
            createdAt: { gt: s.hiddenAt! },
            ...this.between(viewerId, s.peerId),
          },
        }),
      ),
    )
    return new Set(states.filter((_, i) => revived[i] === 0).map((s) => s.peerId))
  }

  /** Total pesan belum dibaca dari teman (badge jewel pesan). */
  async unreadCount(viewerId: number): Promise<{ count: number }> {
    const count = await this.prisma.message.count({
      where: {
        receiverId: viewerId,
        readAt: null,
        deletedAt: null,
        sender: { AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)] },
      },
    })
    return { count }
  }

  /**
   * CHT-04: indikator mengetik. Fire-and-forget: kegagalan (bukan teman, diblokir) diam saja supaya tidak
   * membocorkan apa pun. `true` dibatasi satu per detik per pasangan; `false` selalu diteruskan.
   */
  async typing(senderId: number, toUserId: number, isTyping: boolean): Promise<void> {
    try {
      await this.assertPartner(senderId, toUserId)
    } catch {
      return
    }
    const key = `${senderId}:${toUserId}`
    if (isTyping) {
      const now = Date.now()
      const last = this.typingAt.get(key)
      if (last !== undefined && now - last < 1000) return
      if (this.typingAt.size >= MessagesService.MAX_KEYS) {
        for (const [k, at] of this.typingAt) if (now - at > 5000) this.typingAt.delete(k)
      }
      this.typingAt.set(key, now)
    } else {
      this.typingAt.delete(key)
    }
    this.realtime.emitToUser(toUserId, 'typing', { userId: senderId, isTyping })
  }

  private async create(
    senderId: number,
    receiverId: number,
    content: string,
  ): Promise<ChatMessage> {
    const message = toDto(
      await this.prisma.message.create({ data: { senderId, receiverId, content } }),
    )
    // Ke penerima dan ke tab lain milik pengirim; klien membuang duplikat berdasarkan id.
    this.realtime.emitToUser(receiverId, 'message:new', message)
    this.realtime.emitToUser(senderId, 'message:new', message)
    return message
  }

  private between(a: number, b: number): Prisma.MessageWhereInput {
    return {
      OR: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
      ],
    }
  }

  private async friendIds(viewerId: number): Promise<number[]> {
    const rows = await this.prisma.user.findMany({
      where: { AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)] },
      select: { id: true },
    })
    return rows.map((r) => r.id)
  }

  private async assertPartner(viewerId: number, otherId: number) {
    if (viewerId === otherId) {
      throw new AppException(
        422,
        'SELF_ACTION_NOT_ALLOWED',
        'Tidak bisa mengirim pesan ke diri sendiri',
      )
    }
    const ok = await this.prisma.user.count({
      where: {
        id: otherId,
        AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)],
      },
    })
    if (!ok) throw noUser()
  }

  private prune() {
    const now = Date.now()
    if (this.recent.size < MessagesService.MAX_KEYS) return
    for (const [k, v] of this.recent) if (now - v.at > MessagesService.TTL_MS) this.recent.delete(k)
    // Masih penuh (semua baru): buang yang tertua supaya memori tetap terbatas.
    while (this.recent.size >= MessagesService.MAX_KEYS)
      this.recent.delete(this.recent.keys().next().value!)
  }
}
