import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ChatMessage, Conversation, Paged } from '@retrobook/shared'
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
    const rows = await this.prisma.message.findMany({
      where: { deletedAt: null, ...this.between(viewerId, otherId) },
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
      SELECT MAX(id) AS id FROM messages
      WHERE deleted_at IS NULL
        AND ((sender_id = ${viewerId} AND receiver_id IN (${ids}))
          OR (receiver_id = ${viewerId} AND sender_id IN (${ids})))
      GROUP BY IF(sender_id = ${viewerId}, receiver_id, sender_id)
      ${cursor ? Prisma.sql`HAVING MAX(id) < ${cursor}` : Prisma.empty}
      ORDER BY id DESC
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
