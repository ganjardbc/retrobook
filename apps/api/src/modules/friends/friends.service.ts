import { Injectable } from '@nestjs/common'
import { Friendship, Prisma } from '@prisma/client'
import type {
  FriendRequest,
  FriendsPage,
  FriendshipResult,
  Paged,
  Relationship,
  UserSummary,
} from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { escapeLike } from '../../common/like'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { VisibilityService } from '../visibility/visibility.service'
import { pairOf } from './pair'

const userSummary = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isBot: true,
} satisfies Prisma.UserSelect

const noUser = () => new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')

/**
 * Pertemanan (BR-01): SATU baris per pasangan, kunci (pair_low_id, pair_high_id) = (min, max).
 * Menolak atau membatalkan menghapus baris. Semua perubahan status berjalan dalam transaksi supaya
 * notifikasi (T-32) bisa ditambahkan di transaksi yang sama.
 *
 */
@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly notifications: NotificationsService,
  ) {}

  /** FRD-01. Permintaan silang (lawan sudah mengirim) langsung menjadi ACCEPTED. */
  async sendRequest(viewerId: number, targetId: number): Promise<FriendshipResult> {
    if (viewerId === targetId) {
      throw new AppException(
        422,
        'SELF_ACTION_NOT_ALLOWED',
        'Tidak bisa berteman dengan diri sendiri',
      )
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, ...this.visibility.userWhere(viewerId) },
      select: { id: true },
    })
    if (!target) throw noUser()

    const pair = pairOf(viewerId, targetId)
    // Dua permintaan yang saling silang bisa berlomba membuat baris; UNIQUE memenangkan satu dan
    // yang kalah membaca ulang lalu menerima, sehingga hasil akhirnya tetap satu baris ACCEPTED.
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await this.prisma.friendship.findUnique({
        where: { pairLowId_pairHighId: pair },
      })
      if (existing) return this.resolveExisting(existing, viewerId, targetId)
      try {
        await this.prisma.friendship.create({
          data: { requesterId: viewerId, addresseeId: targetId, ...pair, status: 'PENDING' },
        })
        await this.notifications.notify({
          userId: targetId,
          actorId: viewerId,
          type: 'FRIEND_REQUEST',
        })
        return { userId: targetId, status: 'PENDING' }
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
      }
    }
    throw new AppException(409, 'CONFLICT', 'Permintaan bertabrakan, coba lagi')
  }

  /** FRD-02: hanya penerima yang bisa menerima. Diulang tetap aman. */
  async accept(viewerId: number, requesterId: number): Promise<FriendshipResult> {
    const row = await this.prisma.friendship.findFirst({
      where: {
        requesterId,
        addresseeId: viewerId,
        requester: this.visibility.userWhere(viewerId),
      },
    })
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Permintaan tidak ditemukan')
    if (row.status === 'ACCEPTED') return { userId: requesterId, status: 'ACCEPTED' }
    await this.acceptRow(row.id, requesterId, viewerId)
    return { userId: requesterId, status: 'ACCEPTED' }
  }

  /** Tolak (penerima) atau batalkan (pengirim): menghapus baris PENDING. */
  async cancelOrReject(viewerId: number, otherId: number): Promise<void> {
    const { count } = await this.prisma.friendship.deleteMany({
      where: { ...pairOf(viewerId, otherId), status: 'PENDING' },
    })
    if (count === 0) throw new AppException(404, 'NOT_FOUND', 'Permintaan tidak ditemukan')
  }

  /** FRD-03: menghapus baris untuk kedua arah. */
  async unfriend(viewerId: number, otherId: number): Promise<void> {
    const { count } = await this.prisma.friendship.deleteMany({
      where: { ...pairOf(viewerId, otherId), status: 'ACCEPTED' },
    })
    if (count === 0) throw new AppException(404, 'NOT_FOUND', 'Bukan teman')
  }

  /** Permintaan masuk yang PENDING, terbaru dulu; pengirim yang BANNED/terhapus disembunyikan. */
  async incoming(viewerId: number, limit: number, cursor?: number): Promise<Paged<FriendRequest>> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        addresseeId: viewerId,
        status: 'PENDING',
        requester: this.visibility.userWhere(viewerId),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, createdAt: true, requester: { select: userSummary } },
    })
    const page = rows.slice(0, limit)
    return {
      items: page.map((r) => ({
        user: r.requester as UserSummary,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  /** Syarat Friendship: teman ACCEPTED milik `userId` (kedua arah), pihak lain tidak BANNED/terhapus dan cocok `q`. */
  private acceptedWhere(
    userId: number,
    q?: string,
    viewerId = userId,
  ): Prisma.FriendshipWhereInput {
    const other = (): Prisma.UserWhereInput => ({
      ...this.visibility.userWhere(viewerId),
      ...(q
        ? {
            OR: [
              { displayName: { contains: escapeLike(q) } },
              { username: { contains: escapeLike(q) } },
            ],
          }
        : {}),
    })
    return {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, addressee: other() },
        { addresseeId: userId, requester: other() },
      ],
    }
  }

  /** Jumlah teman yang boleh terlihat (profil, FRD-04). */
  count(userId: number): Promise<number> {
    return this.prisma.friendship.count({ where: this.acceptedWhere(userId) })
  }

  /** Hubungan `viewerId` dengan `otherId` untuk profil. */
  async relationshipOf(viewerId: number, otherId: number): Promise<Relationship> {
    if (viewerId === otherId) return 'SELF'
    const row = await this.prisma.friendship.findUnique({
      where: { pairLowId_pairHighId: pairOf(viewerId, otherId) },
      select: { status: true, requesterId: true },
    })
    if (!row) return 'NONE'
    if (row.status === 'ACCEPTED') return 'FRIENDS'
    return row.requesterId === viewerId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED'
  }

  /** FRD-04: teman (ACCEPTED, kedua arah), terbaru dulu, `q` memfilter nama atau username. */
  async list(
    viewerId: number,
    limit: number,
    cursor?: number,
    q?: string,
    blockedById = viewerId,
  ): Promise<FriendsPage> {
    const where = this.acceptedWhere(viewerId, q, blockedById)
    const [rows, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where,
        orderBy: { id: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          requesterId: true,
          requester: { select: userSummary },
          addressee: { select: userSummary },
        },
      }),
      this.prisma.friendship.count({ where }),
    ])
    const page = rows.slice(0, limit)
    return {
      items: page.map(
        (r) => (r.requesterId === viewerId ? r.addressee : r.requester) as UserSummary,
      ),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
      total,
    }
  }

  private async resolveExisting(
    row: Friendship,
    viewerId: number,
    targetId: number,
  ): Promise<FriendshipResult> {
    if (row.status === 'ACCEPTED') {
      throw new AppException(409, 'ALREADY_FRIENDS', 'Kalian sudah berteman')
    }
    if (row.requesterId === viewerId) {
      throw new AppException(409, 'REQUEST_PENDING', 'Permintaan sudah dikirim')
    }
    await this.acceptRow(row.id, targetId, viewerId)
    return { userId: targetId, status: 'ACCEPTED' }
  }

  /** `requesterId` dikabari bahwa `accepterId` menerima; notifikasi dibuat dalam transaksi yang sama. */
  private async acceptRow(id: number, requesterId: number, accepterId: number) {
    const notif = await this.prisma.$transaction(async (tx) => {
      // Bersyarat pada PENDING: dua penerimaan serentak tidak saling menimpa.
      const { count } = await tx.friendship.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      })
      if (count === 0) return null
      return this.notifications.create(
        { userId: requesterId, actorId: accepterId, type: 'FRIEND_ACCEPT' },
        tx,
      )
    })
    this.notifications.push(requesterId, notif)
  }
}
