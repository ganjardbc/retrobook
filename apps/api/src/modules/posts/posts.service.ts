import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  extractHashtags,
  type FeedSort,
  type Paged,
  type Post as PostDto,
  type SharedPost,
  type TrendingTag,
  type UserSummary,
} from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { BlockedWordsService } from '../blocked-words/blocked-words.service'
import { NotificationsService } from '../notifications/notifications.service'
import { UploadsService } from '../uploads/uploads.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreatePostDto, SharePostDto, UpdatePostDto } from './dto/post.dto'

const userSummary = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isBot: true,
} satisfies Prisma.UserSelect

// Penyuka yang disembunyikan (BANNED/terhapus) tidak ikut dihitung; aturannya ada di VisibilityService.
// Jumlah like dan komentar sengaja BUKAN `_count` di sini: Prisma menerjemahkannya menjadi agregat atas
// seluruh tabel likes/comments pada setiap query (T-63: feed melambat linear terhadap ukuran tabel).
// Jumlahnya dihitung per halaman lewat `counts()` di bawah.
const postInclude = (likerWhere: Prisma.LikeWhereInput, userWhere: Prisma.UserWhereInput) =>
  ({
    // Yang di-tag tetapi BANNED, terhapus, atau terblokir bagi pembaca tidak ditampilkan.
    tags: {
      where: { user: userWhere },
      orderBy: { userId: 'asc' },
      select: { user: { select: userSummary } },
    },
    author: { select: userSummary },
    wallOwner: { select: userSummary },
    likes: {
      where: likerWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
      select: { user: { select: userSummary } },
    },
  }) satisfies Prisma.PostInclude

type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>

const notFound = () => new AppException(404, 'NOT_FOUND', 'Post tidak ditemukan')
const TRENDING_SIZE = 10
const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000
// SRC-02 dan hashtag publik: hanya post publik biasa (bukan wall post) yang tidak disembunyikan admin.
const publicPost: Prisma.PostWhereInput = { privacy: 'PUBLIC', wallOwnerId: null, hidden: false }

const empty = () => new AppException(400, 'VALIDATION_FAILED', 'Post tidak boleh kosong')

const yearRange = (year: number): Prisma.PostWhereInput => ({
  createdAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
})

const hashtagLinks = (tags: string[]) =>
  tags.map((tag) => ({ hashtag: { connectOrCreate: { where: { tag }, create: { tag } } } }))

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly uploads: UploadsService,
    private readonly notifications: NotificationsService,
    private readonly blockedWords: BlockedWordsService,
  ) {}

  async create(viewerId: number, dto: CreatePostDto): Promise<PostDto> {
    const content = dto.content ?? ''
    const imageUrl = dto.imageUrl ?? null
    if (!content.trim() && !imageUrl) throw empty()
    await this.assertUpload(imageUrl)

    if (dto.groupId && dto.wallOwnerUsername) {
      throw new AppException(
        400,
        'VALIDATION_FAILED',
        'Post grup tidak dapat ditulis di dinding teman',
      )
    }
    if (dto.groupId) await this.assertGroupMember(viewerId, dto.groupId)
    const wallOwner = dto.wallOwnerUsername
      ? await this.resolveWallOwner(viewerId, dto.wallOwnerUsername)
      : null
    const defaultPostPrivacy =
      dto.privacy ??
      (
        await this.prisma.user.findUniqueOrThrow({
          where: { id: viewerId },
          select: { defaultPostPrivacy: true },
        })
      ).defaultPostPrivacy
    // Wall post terlihat oleh teman penulis dan pemilik dinding (BR-04); ONLY_ME tidak masuk akal di sini.
    if (wallOwner && dto.privacy === 'ONLY_ME') {
      throw new AppException(400, 'VALIDATION_FAILED', 'Post di dinding teman tidak bisa ONLY_ME')
    }
    const tagIds = await this.resolveTags(viewerId, dto.taggedUserIds ?? [])

    const row = await this.prisma.post.create({
      data: {
        authorId: viewerId,
        content,
        flagged: await this.blockedWords.matches(content),
        imageUrl,
        feeling: dto.feeling ?? null,
        privacy: wallOwner ? 'FRIENDS' : defaultPostPrivacy,
        wallOwnerId: wallOwner?.id,
        groupId: dto.groupId,
        tags: { create: tagIds.map((userId) => ({ userId })) },
        hashtags: { create: hashtagLinks(extractHashtags(content)) },
      },
      include: this.include(viewerId),
    })
    await this.notifyCreated(row.id, viewerId, wallOwner?.id ?? null, tagIds)
    return this.toDto(row, new Set(), new Map())
  }

  async groupTimeline(viewerId: number, groupId: number, limit: number, cursor?: number) {
    await this.assertGroupMember(viewerId, groupId)
    const rows = await this.prisma.post.findMany({
      where: { AND: [{ groupId }, this.visibility.postWhere(viewerId, true)] },
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

  private async assertGroupMember(userId: number, groupId: number) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupId: true },
    })
    if (!member) throw new AppException(404, 'NOT_FOUND', 'Grup tidak ditemukan')
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
    const isShare = current.sharedFromId !== null
    if (isShare && dto.imageUrl) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Share tidak bisa memiliki foto')
    }
    // Share boleh tanpa teks: isinya adalah post asal.
    if (!content.trim() && !imageUrl && !isShare) throw empty()
    if (imageUrl !== current.imageUrl) await this.assertUpload(imageUrl)

    // POST-10: sinkronkan hashtag; yang tetap ada tidak dibuat ulang supaya waktunya (trending) tidak bergeser.
    const tags = extractHashtags(content)
    const existing = await this.prisma.postHashtag.findMany({
      where: { postId: id },
      select: { hashtagId: true, hashtag: { select: { tag: true } } },
    })
    const kept = new Set(existing.map((e) => e.hashtag.tag))
    const removedIds = existing.filter((e) => !tags.includes(e.hashtag.tag)).map((e) => e.hashtagId)
    const row = await this.prisma.post.update({
      where: { id },
      data: {
        content,
        flagged: await this.blockedWords.matches(content),
        imageUrl,
        ...(dto.feeling !== undefined ? { feeling: dto.feeling } : {}),
        privacy: dto.privacy,
        editedAt: new Date(),
        hashtags: {
          deleteMany: { hashtagId: { in: removedIds } },
          create: hashtagLinks(tags.filter((tag) => !kept.has(tag))),
        },
      },
      include: this.include(viewerId),
    })
    return (await this.toDtos(viewerId, [row]))[0]!
  }

  async remove(viewerId: number, id: number): Promise<void> {
    const current = await this.findVisible(viewerId, id)
    if (current.authorId !== viewerId && current.wallOwnerId !== viewerId) {
      throw new AppException(403, 'FORBIDDEN', 'Hanya pemilik yang bisa menghapus post')
    }
    await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  /**
   * POST-07: buat post baru yang merujuk post asal. Pembagi harus bisa melihat post asal. Share dari
   * share merujuk post asal pertamanya (tanpa rantai). Siapa yang boleh melihat isi asal ditentukan
   * saat dibaca (toDtos), jadi membagikan post FRIENDS ke publik tidak membocorkan isinya.
   */
  async share(viewerId: number, id: number, dto: SharePostDto): Promise<PostDto> {
    const original = await this.findVisible(viewerId, id)
    let rootId = original.id
    if (original.sharedFromId !== null) {
      const root = await this.prisma.post.findFirst({
        where: { AND: [{ id: original.sharedFromId }, this.visibility.postWhere(viewerId)] },
        select: { id: true },
      })
      if (!root) {
        throw new AppException(422, 'UNPROCESSABLE', 'Post asal tidak tersedia untuk dibagikan')
      }
      rootId = root.id
    }
    const row = await this.prisma.post.create({
      data: {
        authorId: viewerId,
        content: dto.content ?? '',
        flagged: await this.blockedWords.matches(dto.content ?? ''),
        privacy: dto.privacy ?? 'FRIENDS',
        sharedFromId: rootId,
        hashtags: { create: hashtagLinks(extractHashtags(dto.content ?? '')) },
      },
      include: this.include(viewerId),
    })
    return (await this.toDtos(viewerId, [row]))[0]!
  }

  /**
   * POST-09: `top` mengurutkan berdasarkan jumlah like, lalu terbaru. Kursor tetap id post (Prisma
   * membandingkan nilai urutan baris kursor). shortcut: jumlah untuk urutan menghitung semua penyuka,
   * sedangkan angka yang tampil menyaring penyuka BANNED/terhapus; selisihnya hanya menggeser peringkat.
   */
  async feed(
    viewerId: number,
    limit: number,
    cursor?: number,
    sort: FeedSort = 'recent',
  ): Promise<Paged<PostDto>> {
    const rows = await this.prisma.post.findMany({
      where: this.visibility.feedWhere(viewerId, await this.friendIds(viewerId)),
      orderBy:
        sort === 'top'
          ? [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
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

  /**
   * SRC-02: hashtag terbanyak 24 jam terakhir (maksimal 10), tanpa yang `hidden` (ADM-17). Yang dihitung
   * hanya post publik yang terlihat bagi pembaca ini, jadi post terhapus, disembunyikan, penulis BANNED,
   * dan pasangan blokir tidak ikut (aturan terpusat di VisibilityService).
   */
  async trending(viewerId: number): Promise<{ items: TrendingTag[] }> {
    const rows = await this.prisma.postHashtag.groupBy({
      by: ['hashtagId'],
      where: {
        createdAt: { gte: new Date(Date.now() - TRENDING_WINDOW_MS) },
        hashtag: { hidden: false },
        post: { AND: [this.visibility.postWhere(viewerId), publicPost] },
      },
      _count: { postId: true },
      orderBy: [{ _count: { postId: 'desc' } }, { hashtagId: 'asc' }],
      take: TRENDING_SIZE,
    })
    const tags = await this.prisma.hashtag.findMany({
      where: { id: { in: rows.map((r) => r.hashtagId) } },
      select: { id: true, tag: true },
    })
    const byId = new Map(tags.map((t) => [t.id, t.tag]))
    return { items: rows.map((r) => ({ tag: byId.get(r.hashtagId)!, count: r._count.postId })) }
  }

  /** POST-10: post publik dengan hashtag ini; tag tidak dikenal memberi daftar kosong (tidak membocorkan apa pun). */
  async byHashtag(
    viewerId: number,
    tag: string,
    limit: number,
    cursor?: number,
  ): Promise<Paged<PostDto>> {
    const rows = await this.prisma.post.findMany({
      where: {
        AND: [
          this.visibility.postWhere(viewerId),
          publicPost,
          { hashtags: { some: { hashtag: { tag: tag.toLowerCase() } } } },
        ],
      },
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
    year?: number,
  ): Promise<Paged<PostDto>> {
    const rows = await this.prisma.post.findMany({
      where: {
        AND: [
          this.visibility.postWhere(viewerId),
          { OR: [{ authorId }, { wallOwnerId: authorId }] },
          ...(year === undefined ? [] : [yearRange(year)]),
        ],
      },
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

  /**
   * PRF-05: tahun (UTC) yang punya post pemilik profil yang boleh dibaca viewer, terbaru dulu. Yang dihitung
   * hanya yang lolos aturan terpusat, jadi tahun yang isinya tersembunyi tidak muncul di scroller.
   * shortcut: satu cek per tahun antara post tertua dan terbaru (paling banyak puluhan); ganti ke satu
   * query agregat bila rentang tahun membengkak.
   */
  async timelineYears(viewerId: number, authorId: number): Promise<number[]> {
    const where: Prisma.PostWhereInput = {
      AND: [this.visibility.postWhere(viewerId), { OR: [{ authorId }, { wallOwnerId: authorId }] }],
    }
    const { _min, _max } = await this.prisma.post.aggregate({
      where,
      _min: { createdAt: true },
      _max: { createdAt: true },
    })
    if (!_min.createdAt || !_max.createdAt) return []
    const years: number[] = []
    for (let y = _max.createdAt.getUTCFullYear(); y >= _min.createdAt.getUTCFullYear(); y--) {
      years.push(y)
    }
    const has = await Promise.all(
      years.map((y) =>
        this.prisma.post.findFirst({ where: { AND: [where, yearRange(y)] }, select: { id: true } }),
      ),
    )
    return years.filter((_, i) => has[i])
  }

  /** Pemilik dinding harus teman penulis; selain itu 404 yang sama (tidak membocorkan keberadaan). */
  private async resolveWallOwner(viewerId: number, username: string) {
    const owner = await this.prisma.user.findFirst({
      where: {
        username,
        AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)],
      },
      select: { id: true },
    })
    if (!owner) {
      // Diri sendiri bukan teman: jawab spesifik supaya klien tahu itu salah pakai, bukan 404.
      const self = await this.prisma.user.count({ where: { id: viewerId, username } })
      if (self) {
        throw new AppException(
          422,
          'SELF_ACTION_NOT_ALLOWED',
          'Tidak bisa menulis di dinding sendiri',
        )
      }
      throw new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')
    }
    return owner
  }

  /** WAL-02: hanya teman penulis yang boleh di-tag. */
  private async resolveTags(viewerId: number, ids: number[]): Promise<number[]> {
    if (ids.length === 0) return []
    const friends = await this.prisma.user.findMany({
      where: {
        id: { in: ids },
        AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)],
      },
      select: { id: true },
    })
    if (friends.length !== ids.length) {
      throw new AppException(422, 'UNPROCESSABLE', 'Hanya teman yang bisa di-tag')
    }
    return friends.map((f) => f.id)
  }

  /**
   * Notifikasi WALL_POST untuk pemilik dinding dan TAG untuk yang di-tag. Yang di-tag hanya dikabari bila
   * post itu memang boleh dilihatnya (aturan terpusat); pemilik dinding tidak mendapat TAG ganda.
   */
  private async notifyCreated(
    postId: number,
    actorId: number,
    wallOwnerId: number | null,
    tagIds: number[],
  ) {
    if (wallOwnerId !== null) {
      await this.notifications.notify({ userId: wallOwnerId, actorId, type: 'WALL_POST', postId })
    }
    for (const userId of tagIds.filter((id) => id !== wallOwnerId)) {
      const canSee = await this.prisma.post.count({
        where: { AND: [{ id: postId }, this.visibility.postWhere(userId)] },
      })
      if (canSee) await this.notifications.notify({ userId, actorId, type: 'TAG', postId })
    }
  }

  /** Post yang boleh dibaca viewer, atau 404 yang sama untuk semua sebab (tidak membocorkan keberadaan). */
  private async findVisible(viewerId: number, id: number): Promise<PostRow> {
    const row = await this.prisma.post.findFirst({
      where: { AND: [{ id }, this.visibility.postWhere(viewerId, true)] },
      include: this.include(viewerId),
    })
    if (!row) throw notFound()
    return row
  }

  private include(viewerId: number) {
    return postInclude(this.visibility.likerWhere(viewerId), this.visibility.userWhere(viewerId))
  }

  private async assertUpload(imageUrl: string | null) {
    if (imageUrl && !(await this.uploads.exists(imageUrl))) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Gambar tidak ditemukan; unggah ulang')
    }
  }

  /** Id teman ACCEPTED viewer (dua arah) untuk mempersempit kandidat feed lewat indeks. */
  private async friendIds(viewerId: number): Promise<number[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: viewerId }, { addresseeId: viewerId }] },
      select: { requesterId: true, addresseeId: true },
    })
    return rows.map((r) => (r.requesterId === viewerId ? r.addresseeId : r.requesterId))
  }

  /** Jumlah like dan komentar yang terlihat bagi viewer untuk satu halaman post (dua query terindeks). */
  private async counts(viewerId: number, ids: number[]) {
    const [likes, comments] = await Promise.all([
      this.prisma.like.groupBy({
        by: ['postId'],
        where: { postId: { in: ids }, ...this.visibility.likerWhere(viewerId) },
        _count: { _all: true },
      }),
      this.prisma.comment.groupBy({
        by: ['postId'],
        where: { postId: { in: ids }, ...this.visibility.commentWhere(viewerId) },
        _count: { _all: true },
      }),
    ])
    return {
      likes: new Map(likes.map((l) => [l.postId, l._count._all])),
      comments: new Map(comments.map((c) => [c.postId, c._count._all])),
    }
  }

  private async toDtos(viewerId: number, rows: PostRow[]): Promise<PostDto[]> {
    const counts = await this.counts(
      viewerId,
      rows.map((r) => r.id),
    )
    const liked = await this.prisma.like.findMany({
      where: {
        userId: viewerId,
        postId: { in: rows.map((r) => r.id) },
        ...this.visibility.likerWhere(viewerId),
      },
      select: { postId: true },
    })
    const likedIds = new Set(liked.map((l) => l.postId))

    // Post asal untuk share: hanya yang boleh dilihat pembaca ini (aturan terpusat); selebihnya "tidak tersedia".
    const sharedIds = [
      ...new Set(rows.map((r) => r.sharedFromId).filter((x): x is number => x !== null)),
    ]
    const shared = new Map<number, SharedPost>()
    if (sharedIds.length > 0) {
      const originals = await this.prisma.post.findMany({
        where: { AND: [{ id: { in: sharedIds } }, this.visibility.postWhere(viewerId)] },
        select: {
          id: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          author: { select: userSummary },
        },
      })
      for (const o of originals) {
        shared.set(o.id, {
          id: o.id,
          author: o.author as UserSummary,
          content: o.content,
          imageUrl: o.imageUrl,
          createdAt: o.createdAt.toISOString(),
        })
      }
    }
    return rows.map((r) => this.toDto(r, likedIds, shared, counts))
  }

  private toDto(
    row: PostRow,
    likedIds: Set<number | null>,
    shared: Map<number, SharedPost>,
    counts?: { likes: Map<number | null, number>; comments: Map<number, number> },
  ): PostDto {
    return {
      id: row.id,
      groupId: row.groupId,
      author: row.author as UserSummary,
      wallOwner: row.wallOwner as UserSummary | null,
      sharedFrom:
        row.sharedFromId === null ? null : (shared.get(row.sharedFromId) ?? { unavailable: true }),
      content: row.content,
      imageUrl: row.imageUrl,
      feeling: row.feeling,
      privacy: row.privacy,
      tags: row.tags.map((t) => t.user as UserSummary),
      likeCount: counts?.likes.get(row.id) ?? 0,
      commentCount: counts?.comments.get(row.id) ?? 0,
      likedByMe: likedIds.has(row.id),
      likedPreview: row.likes.map((l) => l.user as UserSummary),
      editedAt: row.editedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
