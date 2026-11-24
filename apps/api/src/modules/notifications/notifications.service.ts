import { Injectable, Logger } from '@nestjs/common'
import { NotifType, Prisma } from '@prisma/client'
import type { Paged, UserSummary } from '@retrobook/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { VisibilityService } from '../visibility/visibility.service'

export type NotificationDto = {
  id: number
  type: NotifType
  actor: UserSummary | null
  postId: number | null
  commentId: number | null
  text: string
  readAt: string | null
  createdAt: string
}

export type NotifyInput = {
  userId: number
  actorId: number | null
  type: NotifType
  postId?: number
  commentId?: number
}

const select = {
  id: true,
  type: true,
  postId: true,
  commentId: true,
  readAt: true,
  createdAt: true,
  actor: {
    select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true },
  },
} satisfies Prisma.NotificationSelect
type Row = Prisma.NotificationGetPayload<{ select: typeof select }>

// Teks bawaan (Inggris, era asli). Tidak memakai packages/shared/i18n: itu sumber .ts untuk Vite dan
// tidak bisa di-require oleh build Node API. Klien boleh menampilkan teksnya sendiri dari `type`.
const TEXT: Record<NotifType, string> = {
  LIKE: '{name} likes your post',
  COMMENT: '{name} commented on your post',
  FRIEND_REQUEST: '{name} sent you a friend request',
  FRIEND_ACCEPT: '{name} accepted your friend request',
  POKE: '{name} poked you',
  TAG: '{name} tagged you in a post',
  WALL_POST: '{name} posted on your wall',
  ANNOUNCEMENT: 'New announcement',
}

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * NTF-01. Membuat satu notifikasi, atau null bila tidak perlu: aksi pada konten sendiri,
   * penerima tidak aktif, pasangan saling blokir (BR-11), atau LIKE yang sama sudah pernah dicatat
   * (like, unlike, like lagi tidak membanjiri). Boleh dipanggil di dalam transaksi (`db`); kirim
   * realtime lewat `push` setelah commit.
   */
  async create(
    input: NotifyInput,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<NotificationDto | null> {
    const { userId, actorId, type, postId, commentId } = input
    if (actorId === userId) return null
    if (actorId !== null) {
      const ok = await db.user.count({
        where: { id: userId, ...this.visibility.userWhere(actorId), status: 'ACTIVE' },
      })
      if (!ok) return null
    }
    if (type === 'LIKE') {
      const dup = await db.notification.count({
        where: { userId, actorId, type, postId: postId ?? null },
      })
      if (dup) return null
    }
    const row = await db.notification.create({
      data: { userId, actorId, type, postId, commentId },
      select,
    })
    return this.toDto(row)
  }

  /** Kirim `notification:new` ke semua koneksi penerima. */
  push(userId: number, dto: NotificationDto | null) {
    if (dto) this.realtime.emitToUser(userId, 'notification:new', dto)
  }

  /** create + push untuk pemanggil di luar transaksi. Kegagalan notifikasi tidak menggagalkan aksinya. */
  async notify(input: NotifyInput): Promise<void> {
    try {
      this.push(input.userId, await this.create(input))
    } catch (e) {
      this.log.warn(`notifikasi ${input.type} untuk user ${input.userId} gagal: ${String(e)}`)
    }
  }

  async list(viewerId: number, limit: number, cursor?: number): Promise<Paged<NotificationDto>> {
    const rows = await this.prisma.notification.findMany({
      where: this.visibleTo(viewerId),
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select,
    })
    const page = rows.slice(0, limit)
    return {
      items: page.map((r) => this.toDto(r)),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  async unreadCount(viewerId: number): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { ...this.visibleTo(viewerId), readAt: null },
    })
    return { count }
  }

  /** Tanpa `ids`: semua. Hanya milik sendiri; id orang lain diabaikan. Mengembalikan sisa belum dibaca. */
  async markRead(viewerId: number, ids?: number[]): Promise<{ count: number }> {
    await this.prisma.notification.updateMany({
      where: { userId: viewerId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    })
    return this.unreadCount(viewerId)
  }

  /**
   * Notifikasi milik viewer yang masih boleh dilihat: aktor, post, dan komentar terkait harus lolos
   * aturan visibilitas saat dibaca (dihapus, disembunyikan, privasi berubah, atau diblokir = hilang).
   */
  private visibleTo(viewerId: number): Prisma.NotificationWhereInput {
    return {
      userId: viewerId,
      AND: [
        { OR: [{ actorId: null }, { actor: this.visibility.userWhere(viewerId) }] },
        { OR: [{ postId: null }, { post: this.visibility.postWhere(viewerId) }] },
        { OR: [{ commentId: null }, { comment: this.visibility.commentWhere(viewerId) }] },
      ],
    }
  }

  private toDto(row: Row): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      actor: row.actor,
      postId: row.postId,
      commentId: row.commentId,
      text: TEXT[row.type].replace('{name}', row.actor?.displayName ?? ''),
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
