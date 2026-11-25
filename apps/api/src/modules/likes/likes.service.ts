import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Paged, UserSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { NEWEST_FIRST } from '../../common/keyset'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { VisibilityService } from '../visibility/visibility.service'

export type LikeState = { likeCount: number; likedByMe: boolean }

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Like post (idempoten): mengulang tidak membuat baris kedua. */
  async like(viewerId: number, postId: number): Promise<LikeState> {
    const post = await this.assertVisible(viewerId, postId)
    try {
      await this.prisma.like.create({ data: { userId: viewerId, postId } })
      await this.notifications.notify({
        userId: post.authorId,
        actorId: viewerId,
        type: 'LIKE',
        postId,
      })
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
      orderBy: NEWEST_FIRST,
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

  async likeComment(viewerId: number, commentId: number): Promise<LikeState> {
    await this.assertCommentVisible(viewerId, commentId)
    try {
      await this.prisma.like.create({ data: { userId: viewerId, commentId } })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
        throw error
    }
    return this.commentState(viewerId, commentId)
  }

  async unlikeComment(viewerId: number, commentId: number): Promise<LikeState> {
    await this.assertCommentVisible(viewerId, commentId)
    await this.prisma.like.deleteMany({ where: { userId: viewerId, commentId } })
    return this.commentState(viewerId, commentId)
  }

  async listCommentLikes(viewerId: number, commentId: number, limit: number, cursor?: number) {
    await this.assertCommentVisible(viewerId, commentId)
    const rows = await this.prisma.like.findMany({
      where: { commentId, ...this.visibility.likerWhere(viewerId) },
      orderBy: NEWEST_FIRST,
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
      items: page.map((row) => row.user),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  /** 404 yang sama untuk post yang tidak ada dan yang tidak boleh dilihat. */
  private async assertVisible(viewerId: number, postId: number) {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ id: postId }, this.visibility.postWhere(viewerId, true)] },
      select: { id: true, authorId: true },
    })
    if (!post) throw new AppException(404, 'NOT_FOUND', 'Post tidak ditemukan')
    return post
  }

  private async assertCommentVisible(viewerId: number, commentId: number) {
    const comment = await this.prisma.comment.findFirst({
      where: {
        AND: [{ id: commentId }, this.visibility.commentWhere(viewerId)],
        post: this.visibility.postWhere(viewerId, true),
      },
      select: { id: true },
    })
    if (!comment) throw new AppException(404, 'NOT_FOUND', 'Komentar tidak ditemukan')
  }

  private async commentState(viewerId: number, commentId: number): Promise<LikeState> {
    const where = { commentId, ...this.visibility.likerWhere(viewerId) }
    const [likeCount, mine] = await Promise.all([
      this.prisma.like.count({ where }),
      this.prisma.like.count({ where: { ...where, userId: viewerId } }),
    ])
    return { likeCount, likedByMe: mine > 0 }
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
