import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { FriendSuggestion, UserSummary } from '@retrobook/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'

const userSummary = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isBot: true,
} satisfies Prisma.UserSelect

/** Berapa kandidat teratas (menurut teman bersama) yang diperiksa lebih jauh sebelum dipotong `limit`. */
const CANDIDATE_POOL = 100

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** FRD-05 dan FRD-07: penemuan teman. Semua yang ditampilkan melewati aturan visibilitas terpusat. */
@Injectable()
export class FriendDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  /**
   * People You May Know: teman dari teman, diurutkan menurut jumlah teman bersama. Tidak memuat diri sendiri,
   * siapa pun yang sudah punya hubungan pertemanan dengan viewer (teman atau permintaan, arah mana pun),
   * bot, atau akun yang tidak boleh dilihat (BANNED, terhapus, blokir dua arah). Teman bersama yang sendiri
   * tidak boleh dilihat viewer tidak dihitung.
   * shortcut: agregasi di memori atas teman viewer; ganti dengan SQL bila graf pertemanan membesar.
   */
  async suggestions(viewerId: number, limit: number): Promise<{ items: FriendSuggestion[] }> {
    const friendIds = await this.friendIds(viewerId)
    if (friendIds.length === 0) return { items: [] }
    const mine = new Set(friendIds)

    const edges = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: { in: friendIds } }, { addresseeId: { in: friendIds } }],
      },
      select: { requesterId: true, addresseeId: true },
    })
    const mutual = new Map<number, number>()
    for (const { requesterId, addresseeId } of edges) {
      // Satu baris per pasangan: tiap teman viewer menyumbang paling banyak satu ke satu kandidat.
      for (const [friend, other] of [
        [requesterId, addresseeId],
        [addresseeId, requesterId],
      ] as const) {
        if (mine.has(friend) && other !== viewerId && !mine.has(other)) {
          mutual.set(other, (mutual.get(other) ?? 0) + 1)
        }
      }
    }
    const ranked = [...mutual.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, CANDIDATE_POOL)
    if (ranked.length === 0) return { items: [] }
    const ids = ranked.map(([id]) => id)

    const related = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: viewerId, addresseeId: { in: ids } },
          { addresseeId: viewerId, requesterId: { in: ids } },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    })
    const skip = new Set(related.flatMap((r) => [r.requesterId, r.addresseeId]))
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: ids.filter((id) => !skip.has(id)) },
        isBot: false,
        ...this.visibility.userWhere(viewerId),
      },
      select: userSummary,
    })
    const byId = new Map(users.map((u) => [u.id, u]))
    const items: FriendSuggestion[] = []
    for (const [id, count] of ranked) {
      const user = byId.get(id)
      if (user) items.push({ user, mutualFriends: count })
      if (items.length === limit) break
    }
    return { items }
  }

  /**
   * Teman yang berulang tahun pada `date` (YYYY-MM-DD; bawaan hari ini UTC). Yang lahir 29 Februari dirayakan
   * 1 Maret pada tahun bukan kabisat.
   */
  async birthdays(viewerId: number, date?: string): Promise<{ items: UserSummary[] }> {
    const [y, m, d] = date
      ? (date.split('-').map(Number) as [number, number, number])
      : (() => {
          const now = new Date()
          return [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()] as const
        })()
    const rows = await this.prisma.user.findMany({
      where: {
        AND: [
          this.visibility.userWhere(viewerId),
          this.visibility.friendOf(viewerId),
          { birthday: { not: null } },
        ],
      },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      select: { ...userSummary, birthday: true },
    })
    const items = rows
      .filter((r) => {
        const bm = r.birthday!.getUTCMonth() + 1
        const bd = r.birthday!.getUTCDate()
        if (bm === m && bd === d) return true
        return bm === 2 && bd === 29 && m === 3 && d === 1 && !isLeap(y)
      })
      .map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        isBot: r.isBot,
      }))
    return { items }
  }

  private async friendIds(viewerId: number): Promise<number[]> {
    const rows = await this.prisma.user.findMany({
      where: { AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)] },
      select: { id: true },
    })
    return rows.map((r) => r.id)
  }
}
