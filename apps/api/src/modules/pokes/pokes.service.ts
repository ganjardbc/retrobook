import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Paged, UserSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { VisibilityService } from '../visibility/visibility.service'

export type PokeItem = { user: UserSummary; createdAt: string }

const noUser = () => new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')

/**
 * POK-01. Poke hanya antar teman (keputusan D-6, usulan dokumen). Satu baris per arah
 * (UNIQUE from, to): poke ulang memperbarui baris yang sama, bukan menambah.
 */
@Injectable()
export class PokesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Poke atau poke balik. Bukan teman, diblokir, atau tidak ada: 404 yang sama (tidak membocorkan). */
  async poke(viewerId: string, targetId: string): Promise<{ userId: string; createdAt: string }> {
    if (viewerId === targetId) {
      throw new AppException(422, 'SELF_ACTION_NOT_ALLOWED', 'Tidak bisa mem-poke diri sendiri')
    }
    const target = await this.prisma.user.findFirst({
      where: {
        id: targetId,
        AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)],
      },
      select: { id: true },
    })
    if (!target) throw noUser()

    // Upsert + menutup poke lawan + notifikasi berjalan dalam satu transaksi.
    const { row, notif } = await this.withRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const now = new Date()
        const row = await tx.poke.upsert({
          where: { fromUserId_toUserId: { fromUserId: viewerId, toUserId: targetId } },
          create: { fromUserId: viewerId, toUserId: targetId, createdAt: now },
          update: { createdAt: now, seenAt: null },
        })
        // Membalas poke dari target menuntaskan poke itu ("sampai dilihat atau dibalas").
        await tx.poke.updateMany({
          where: { fromUserId: targetId, toUserId: viewerId, seenAt: null },
          data: { seenAt: now },
        })
        const notif = await this.notifications.create(
          { userId: targetId, actorId: viewerId, type: 'POKE' },
          tx,
        )
        return { row, notif }
      }),
    )
    this.notifications.push(targetId, notif)
    if (notif?.actor) this.realtime.emitToUser(targetId, 'poke:new', { from: notif.actor })
    return { userId: targetId, createdAt: row.createdAt.toISOString() }
  }

  /** Poke aktif yang diterima: belum dilihat atau dibalas, dari teman yang masih boleh terlihat. */
  async list(viewerId: string, limit: number, cursor?: string): Promise<Paged<PokeItem>> {
    const rows = await this.prisma.poke.findMany({
      where: {
        toUserId: viewerId,
        seenAt: null,
        from: { AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)] },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        createdAt: true,
        from: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true },
        },
      },
    })
    const page = rows.slice(0, limit)
    return {
      items: page.map((r) => ({ user: r.from, createdAt: r.createdAt.toISOString() })),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  /** "Remove": tandai poke dari `fromId` sebagai sudah dilihat. */
  async dismiss(viewerId: string, fromId: string): Promise<void> {
    const { count } = await this.prisma.poke.updateMany({
      where: { fromUserId: fromId, toUserId: viewerId, seenAt: null },
      data: { seenAt: new Date() },
    })
    if (count === 0) throw new AppException(404, 'NOT_FOUND', 'Poke tidak ditemukan')
  }

  /** Dua poke serentak bisa berlomba membuat baris yang sama; yang kalah mengulang sebagai update. */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
      return fn()
    }
  }
}
