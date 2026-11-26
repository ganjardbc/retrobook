import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Comment as CommentDto, Paged, UserSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { BlockedWordsService } from '../blocked-words/blocked-words.service'
import { NotificationsService } from '../notifications/notifications.service'
import { VisibilityService } from '../visibility/visibility.service'
import { UploadsService } from '../uploads/uploads.service'
import type { CreateCommentDto } from './dto/comment.dto'

const commentSelect = {
  id: true,
  postId: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
} satisfies Prisma.CommentSelect

type Row = Prisma.CommentGetPayload<{ select: typeof commentSelect }>

const postNotFound = () => new AppException(404, 'NOT_FOUND', 'Post not found')

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly notifications: NotificationsService,
    private readonly blockedWords: BlockedWordsService,
    private readonly uploads: UploadsService,
  ) {}

  /** Urut lama ke baru (INT-02), kursor = id komentar terakhir yang sudah diterima. */
  async list(
    viewerId: string,
    postId: string,
    limit: number,
    cursor?: string,
  ): Promise<Paged<CommentDto>> {
    await this.assertPostVisible(viewerId, postId)
    const rows = await this.prisma.comment.findMany({
      where: { AND: [{ postId }, this.visibility.commentWhere(viewerId)] },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: commentSelect,
    })
    const page = rows.slice(0, limit)
    const ids = page.map((row) => row.id)
    const [likes, mine] = await Promise.all([
      this.prisma.like.groupBy({
        by: ['commentId'],
        where: { commentId: { in: ids }, ...this.visibility.likerWhere(viewerId) },
        _count: { _all: true },
      }),
      this.prisma.like.findMany({
        where: { commentId: { in: ids }, userId: viewerId },
        select: { commentId: true },
      }),
    ])
    const counts = new Map(likes.map((like) => [like.commentId, like._count._all]))
    const liked = new Set(mine.map((like) => like.commentId))
    return {
      items: page.map((r) => this.toDto(r, counts.get(r.id) ?? 0, liked.has(r.id))),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  async create(viewerId: string, postId: string, dto: CreateCommentDto): Promise<CommentDto> {
    const post = await this.assertPostVisible(viewerId, postId)
    const content = dto.content ?? ''
    const imageUrl = dto.imageUrl ?? null
    if (!content.trim() && !imageUrl)
      throw new AppException(400, 'VALIDATION_FAILED', 'Comment must not be empty')
    if (imageUrl && !(await this.uploads.exists(imageUrl))) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Image not found; please upload it again')
    }
    const row = await this.prisma.comment.create({
      data: {
        postId,
        authorId: viewerId,
        content,
        imageUrl,
        flagged: await this.blockedWords.matches(content),
      },
      select: commentSelect,
    })
    await this.notifications.notify({
      userId: post.authorId,
      actorId: viewerId,
      type: 'COMMENT',
      postId,
      commentId: row.id,
    })
    return this.toDto(row)
  }

  /** Boleh dihapus oleh penulis komentar atau pemilik post (INT-02). Soft delete. */
  async remove(viewerId: string, commentId: string): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { AND: [{ id: commentId }, this.visibility.commentWhere(viewerId)] },
      select: { id: true, postId: true, authorId: true, post: { select: { authorId: true } } },
    })
    if (!comment) throw new AppException(404, 'NOT_FOUND', 'Comment not found')
    // Komentar di post yang tidak terlihat oleh viewer diperlakukan seperti tidak ada.
    await this.assertPostVisible(viewerId, comment.postId, 'Comment not found')
    if (comment.authorId !== viewerId && comment.post.authorId !== viewerId) {
      throw new AppException(403, 'FORBIDDEN', 'You may not delete this comment')
    }
    await this.prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } })
  }

  private async assertPostVisible(viewerId: string, postId: string, message?: string) {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ id: postId }, this.visibility.postWhere(viewerId, true)] },
      select: { id: true, authorId: true },
    })
    if (!post) throw message ? new AppException(404, 'NOT_FOUND', message) : postNotFound()
    return post
  }

  private toDto(row: Row, likeCount = 0, likedByMe = false): CommentDto {
    return {
      id: row.id,
      postId: row.postId,
      author: row.author as UserSummary,
      content: row.content,
      imageUrl: row.imageUrl,
      likeCount,
      likedByMe,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
