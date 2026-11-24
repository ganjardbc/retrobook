import { Injectable } from '@nestjs/common'
import type { Paged, UserSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'
import { pairOf } from '../friends/pair'

const userSummary = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isBot: true,
} as const

@Injectable()
export class BlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async block(blockerId: number, blockedId: number): Promise<{ userId: number }> {
    if (blockerId === blockedId) {
      throw new AppException(422, 'SELF_ACTION_NOT_ALLOWED', 'Tidak bisa memblokir diri sendiri')
    }
    const target = await this.prisma.user.findFirst({
      where: { id: blockedId, deletedAt: null, status: { not: 'BANNED' } },
      select: { id: true },
    })
    if (!target) throw new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')

    const pair = pairOf(blockerId, blockedId)
    await this.prisma.$transaction(async (tx) => {
      await tx.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      })
      await tx.friendship.deleteMany({ where: pair })
    })
    return { userId: blockedId }
  }

  async unblock(blockerId: number, blockedId: number): Promise<void> {
    const { count } = await this.prisma.block.deleteMany({ where: { blockerId, blockedId } })
    if (!count) throw new AppException(404, 'NOT_FOUND', 'Blokir tidak ditemukan')
  }

  async list(blockerId: number, limit: number, cursor?: number): Promise<Paged<UserSummary>> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId, blocked: this.visibility.userWhere() },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, blocked: { select: userSummary } },
    })
    const page = rows.slice(0, limit)
    return {
      items: page.map((row) => row.blocked as UserSummary),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }
}
