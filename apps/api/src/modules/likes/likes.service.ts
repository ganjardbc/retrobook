import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Paged, UserSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'

export type LikeState = { likeCount: number; likedByMe: boolean }

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  /** Like post (idempoten): mengulang tidak membuat baris kedua. */
  async like(viewerId: number, postId: number): Promise<LikeState> {
    await this.assertVisible(viewerId, postId)
    try {
      await this.prisma.like.create({ data: { userId: viewerId, postId } })
    } catch (e) {
      // Dua permintaan bersamaan: UNIQUE (user_id, post_id) menolak yang kedua; hasil akhirnya sama.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
    }
    return this.state(viewerId, postId)
  }

  /** Unlike (idempoten). */
  async unlike(viewerId: number, postId: number): Promise<LikeState> {
    await this.assertVisible(viewerId, postId)
    await this.prisma.like.deleteMany({ where: { userId: viewerId, postId } })
    return this.state(viewerId, postId)
  }

  /** Daftar penyuka, terbaru dulu, dengan kursor id like. */
  async list(
    viewerId: number,
    postId: number,
    limit: number,
    cursor?: number,
  ): Promise<Paged<UserSummary>> {
    await this.assertVisible(viewerId, postId)
    const rows = await this.prisma.like.findMany({
      where: { postId, ...this.visibility.likerWhere(viewerId) },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true },
        },
      },
    })
    const page = rows.slice(0, limit)
    return {
      items: page.map((r) => r.user),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  /** 404 yang sama untuk post yang tidak ada dan yang tidak boleh dilihat. */
  private async assertVisible(viewerId: number, postId: number) {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ id: postId }, this.visibility.postWhere(viewerId)] },
      select: { id: true },
    })
    if (!post) throw new AppException(404, 'NOT_FOUND', 'Post tidak ditemukan')
  }

  private async state(viewerId: number, postId: number): Promise<LikeState> {
    const where = { postId, ...this.visibility.likerWhere(viewerId) }
    const [likeCount, mine] = await Promise.all([
      this.prisma.like.count({ where }),
      this.prisma.like.count({ where: { ...where, userId: viewerId } }),
    ])
    return { likeCount, likedByMe: mine > 0 }
  }
}
