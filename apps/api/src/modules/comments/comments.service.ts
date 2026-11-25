import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Comment as CommentDto, Paged, UserSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { BlockedWordsService } from '../blocked-words/blocked-words.service'
import { NotificationsService } from '../notifications/notifications.service'
import { VisibilityService } from '../visibility/visibility.service'

const commentSelect = {
  id: true,
  postId: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
} satisfies Prisma.CommentSelect

type Row = Prisma.CommentGetPayload<{ select: typeof commentSelect }>

const postNotFound = () => new AppException(404, 'NOT_FOUND', 'Post tidak ditemukan')

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly notifications: NotificationsService,
    private readonly blockedWords: BlockedWordsService,
  ) {}

  /** Urut lama ke baru (INT-02), kursor = id komentar terakhir yang sudah diterima. */
  async list(
    viewerId: number,
    postId: number,
    limit: number,
    cursor?: number,
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
    return {
      items: page.map((r) => this.toDto(r)),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  async create(viewerId: number, postId: number, content: string): Promise<CommentDto> {
    const post = await this.assertPostVisible(viewerId, postId)
    if (!content.trim())
      throw new AppException(400, 'VALIDATION_FAILED', 'Komentar tidak boleh kosong')
    const row = await this.prisma.comment.create({
      data: { postId, authorId: viewerId, content, flagged: await this.blockedWords.matches(content) },
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
  async remove(viewerId: number, commentId: number): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { AND: [{ id: commentId }, this.visibility.commentWhere(viewerId)] },
      select: { id: true, postId: true, authorId: true, post: { select: { authorId: true } } },
    })
    if (!comment) throw new AppException(404, 'NOT_FOUND', 'Komentar tidak ditemukan')
    // Komentar di post yang tidak terlihat oleh viewer diperlakukan seperti tidak ada.
    await this.assertPostVisible(viewerId, comment.postId, 'Komentar tidak ditemukan')
    if (comment.authorId !== viewerId && comment.post.authorId !== viewerId) {
      throw new AppException(403, 'FORBIDDEN', 'Tidak boleh menghapus komentar ini')
    }
    await this.prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } })
  }

  private async assertPostVisible(viewerId: number, postId: number, message?: string) {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ id: postId }, this.visibility.postWhere(viewerId)] },
      select: { id: true, authorId: true },
    })
    if (!post) throw message ? new AppException(404, 'NOT_FOUND', message) : postNotFound()
    return post
  }

  private toDto(row: Row): CommentDto {
    return {
      id: row.id,
      postId: row.postId,
      author: row.author as UserSummary,
      content: row.content,
      imageUrl: row.imageUrl,
      likeCount: 0, // like komentar: INT-03 (T-79)
      likedByMe: false,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
