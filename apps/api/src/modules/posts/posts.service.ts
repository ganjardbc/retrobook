import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Paged, Post as PostDto, UserSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { UploadsService } from '../uploads/uploads.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreatePostDto, UpdatePostDto } from './dto/post.dto'

const userSummary = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isBot: true,
} satisfies Prisma.UserSelect

// Penyuka yang disembunyikan (BANNED/terhapus) tidak ikut dihitung; aturannya ada di VisibilityService.
const postInclude = (likerWhere: Prisma.LikeWhereInput, commentWhere: Prisma.CommentWhereInput) =>
  ({
    author: { select: userSummary },
    _count: {
      select: {
        likes: { where: likerWhere },
        comments: { where: commentWhere },
      },
    },
    likes: {
      where: likerWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
      select: { user: { select: userSummary } },
    },
  }) satisfies Prisma.PostInclude

type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>

const notFound = () => new AppException(404, 'NOT_FOUND', 'Post tidak ditemukan')
const empty = () => new AppException(400, 'VALIDATION_FAILED', 'Post tidak boleh kosong')

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly uploads: UploadsService,
  ) {}

  async create(viewerId: number, dto: CreatePostDto): Promise<PostDto> {
    const content = dto.content ?? ''
    const imageUrl = dto.imageUrl ?? null
    if (!content.trim() && !imageUrl) throw empty()
    await this.assertUpload(imageUrl)

    const row = await this.prisma.post.create({
      data: { authorId: viewerId, content, imageUrl, privacy: dto.privacy ?? 'FRIENDS' },
      include: this.include(viewerId),
    })
    return this.toDto(row, new Set())
  }

  async get(viewerId: number, id: number): Promise<PostDto> {
    const row = await this.findVisible(viewerId, id)
    return (await this.toDtos(viewerId, [row]))[0]!
  }

  async update(viewerId: number, id: number, dto: UpdatePostDto): Promise<PostDto> {
    const current = await this.findVisible(viewerId, id)
    if (current.authorId !== viewerId) {
      throw new AppException(403, 'FORBIDDEN', 'Hanya pemilik yang bisa mengubah post')
    }
    const content = dto.content ?? current.content
    // `imageUrl: null` menghapus foto; tidak dikirim berarti tidak berubah.
    const imageUrl = dto.imageUrl === undefined ? current.imageUrl : dto.imageUrl
    if (!content.trim() && !imageUrl) throw empty()
    if (imageUrl !== current.imageUrl) await this.assertUpload(imageUrl)

    const row = await this.prisma.post.update({
      where: { id },
      data: { content, imageUrl, privacy: dto.privacy, editedAt: new Date() },
      include: this.include(viewerId),
    })
    return (await this.toDtos(viewerId, [row]))[0]!
  }

  async remove(viewerId: number, id: number): Promise<void> {
    const current = await this.findVisible(viewerId, id)
    if (current.authorId !== viewerId) {
      throw new AppException(403, 'FORBIDDEN', 'Hanya pemilik yang bisa menghapus post')
    }
    await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async feed(viewerId: number, limit: number, cursor?: number): Promise<Paged<PostDto>> {
    const rows = await this.prisma.post.findMany({
      where: this.visibility.feedWhere(viewerId),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: this.include(viewerId),
    })
    const page = rows.slice(0, limit)
    return {
      items: await this.toDtos(viewerId, page),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  /** Timeline profil: post `authorId` yang boleh dibaca viewer (aturan yang sama dengan feed). */
  async timeline(
    viewerId: number,
    authorId: number,
    limit: number,
    cursor?: number,
  ): Promise<Paged<PostDto>> {
    const rows = await this.prisma.post.findMany({
      where: { AND: [this.visibility.postWhere(viewerId), { authorId }] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: this.include(viewerId),
    })
    const page = rows.slice(0, limit)
    return {
      items: await this.toDtos(viewerId, page),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }

  /** Post yang boleh dibaca viewer, atau 404 yang sama untuk semua sebab (tidak membocorkan keberadaan). */
  private async findVisible(viewerId: number, id: number): Promise<PostRow> {
    const row = await this.prisma.post.findFirst({
      where: { AND: [{ id }, this.visibility.postWhere(viewerId)] },
      include: this.include(viewerId),
    })
    if (!row) throw notFound()
    return row
  }

  private include(viewerId: number) {
    return postInclude(this.visibility.likerWhere(), this.visibility.commentWhere(viewerId))
  }

  private async assertUpload(imageUrl: string | null) {
    if (imageUrl && !(await this.uploads.exists(imageUrl))) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Gambar tidak ditemukan; unggah ulang')
    }
  }

  private async toDtos(viewerId: number, rows: PostRow[]): Promise<PostDto[]> {
    const liked = await this.prisma.like.findMany({
      where: {
        userId: viewerId,
        postId: { in: rows.map((r) => r.id) },
        ...this.visibility.likerWhere(),
      },
      select: { postId: true },
    })
    const likedIds = new Set(liked.map((l) => l.postId))
    return rows.map((r) => this.toDto(r, likedIds))
  }

  private toDto(row: PostRow, likedIds: Set<number | null>): PostDto {
    return {
      id: row.id,
      author: row.author as UserSummary,
      wallOwner: null, // wall post: T-35
      sharedFrom: null, // share: T-23
      content: row.content,
      imageUrl: row.imageUrl,
      feeling: row.feeling,
      privacy: row.privacy,
      tags: [], // tag teman: T-35
      likeCount: row._count.likes,
      commentCount: row._count.comments,
      likedByMe: likedIds.has(row.id),
      likedPreview: row.likes.map((l) => l.user as UserSummary),
      editedAt: row.editedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
