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
  type YearInReview,
} from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { afterCursor, cmp, NEWEST_FIRST } from '../../common/keyset'
import { escapeLike } from '../../common/like'
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
      orderBy: NEWEST_FIRST,
      take: 2,
      select: { user: { select: userSummary } },
    },
  }) satisfies Prisma.PostInclude

type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>

const notFound = () => new AppException(404, 'NOT_FOUND', 'Post tidak ditemukan')
const TRENDING_SIZE = 10
const TOP_WINDOW = 2000
const SEARCH_BATCH = 500
const SEARCH_MAX_BATCHES = 10
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

  async create(viewerId: string, dto: CreatePostDto): Promise<PostDto> {
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
    // Tag mengirim notifikasi ke orang yang bisa saja bukan anggota grup: tidak diizinkan di post grup.
    if (dto.groupId && dto.taggedUserIds?.length) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Post grup tidak dapat men-tag teman')
    }
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
    return this.toDto(row, new Set(), new Set(), new Map())
  }

  async groupTimeline(viewerId: string, groupId: string, limit: number, cursor?: string) {
    await this.assertGroupMember(viewerId, groupId)
    const rows = await this.prisma.post.findMany({
      where: { AND: [{ groupId }, this.visibility.postWhere(viewerId, true)] },
      orderBy: NEWEST_FIRST,
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

  private async assertGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupId: true },
    })
    if (!member) throw new AppException(404, 'NOT_FOUND', 'Grup tidak ditemukan')
  }

  async get(viewerId: string, id: string): Promise<PostDto> {
    const row = await this.findVisible(viewerId, id)
    return (await this.toDtos(viewerId, [row]))[0]!
  }

  /**
   * Halaman detail post: post lain dari penulis yang sama (di grup yang sama untuk post grup), lalu
   * dilengkapi post terbaru dari feed bila kurang. Semuanya lewat VisibilityService; post asal 404 bila tak terlihat.
   */
  async related(viewerId: string, id: string, limit = 5): Promise<PostDto[]> {
    const base = await this.findVisible(viewerId, id)
    const order = [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
    const same = await this.prisma.post.findMany({
      where: {
        AND: [
          this.visibility.postWhere(viewerId, base.groupId !== null),
          { id: { not: id }, authorId: base.authorId, groupId: base.groupId },
        ],
      },
      orderBy: order,
      take: limit,
      include: this.include(viewerId),
    })
    let rows = same
    if (rows.length < limit && base.groupId === null) {
      const recent = await this.prisma.post.findMany({
        where: {
          AND: [
            this.visibility.feedWhere(viewerId, await this.friendIds(viewerId)),
            { id: { notIn: [id, ...same.map((p) => p.id)] } },
          ],
        },
        orderBy: order,
        take: limit - rows.length,
        include: this.include(viewerId),
      })
      rows = [...same, ...recent]
    }
    return this.toDtos(viewerId, rows)
  }

  async update(viewerId: string, id: string, dto: UpdatePostDto): Promise<PostDto> {
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

  async remove(viewerId: string, id: string): Promise<void> {
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
  async share(viewerId: string, id: string, dto: SharePostDto): Promise<PostDto> {
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
   * POST-09: `top` mengurutkan berdasarkan jumlah like, lalu terbaru, lalu id (lihat `topFeed`). Kursor
   * tetap id post.
   */
  async feed(
    viewerId: string,
    limit: number,
    cursor?: string,
    sort: FeedSort = 'recent',
  ): Promise<Paged<PostDto>> {
    const where = this.visibility.feedWhere(viewerId, await this.friendIds(viewerId))
    if (sort === 'top') return this.topFeed(viewerId, where, limit, cursor)
    const rows = await this.prisma.post.findMany({
      where,
      orderBy: NEWEST_FIRST,
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
   * Top Stories (T-88): `orderBy likes._count` membuat MySQL menghitung agregat berkorelasi per baris
   * (p95 326 ms pada 5.000 post). Sekarang: ambil id kandidat feed yang terlihat (TOP_WINDOW terbaru), hitung
   * like dengan satu groupBy terindeks, urutkan di memori, lalu muat halaman yang diminta.
   * shortcut: hanya TOP_WINDOW post terbaru yang ikut diperingkat, dan jumlah untuk urutan menghitung semua
   * penyuka sedangkan angka yang tampil menyaring penyuka BANNED/terhapus (selisihnya hanya menggeser
   * peringkat). Naikkan jendela atau simpan kolom like_count bila perlu.
   */
  private async topFeed(
    viewerId: string,
    where: Prisma.PostWhereInput,
    limit: number,
    cursor?: string,
  ): Promise<Paged<PostDto>> {
    const candidates = await this.prisma.post.findMany({
      where,
      orderBy: NEWEST_FIRST,
      take: TOP_WINDOW,
      select: { id: true, createdAt: true },
    })
    const counts = new Map(
      (
        await this.prisma.like.groupBy({
          by: ['postId'],
          where: { postId: { in: candidates.map((c) => c.id) } },
          _count: { _all: true },
        })
      ).map((g) => [g.postId, g._count._all]),
    )
    const sorted = candidates
      .map((c) => ({ ...c, likes: counts.get(c.id) ?? 0 }))
      .sort((x, y) => y.likes - x.likes || +y.createdAt - +x.createdAt || cmp(y.id, x.id))
    const start = cursor === undefined ? 0 : sorted.findIndex((c) => c.id === cursor) + 1
    // Kursor yang tidak ada lagi (dihapus atau di luar jendela): halaman kosong, seperti kursor Prisma.
    if (cursor !== undefined && start === 0) return { items: [], nextCursor: null }
    const slice = sorted.slice(start, start + limit + 1)
    const ids = slice.slice(0, limit).map((c) => c.id)
    const rows = await this.prisma.post.findMany({
      where: { id: { in: ids } },
      include: this.include(viewerId),
    })
    const byId = new Map(rows.map((r) => [r.id, r]))
    const page = ids.map((id) => byId.get(id)).filter((r): r is PostRow => r !== undefined)
    return {
      items: await this.toDtos(viewerId, page),
      nextCursor: slice.length > limit ? ids[ids.length - 1]! : null,
    }
  }

  /**
   * SRC-02: hashtag terbanyak 24 jam terakhir (maksimal 10), tanpa yang `hidden` (ADM-17). Yang dihitung
   * hanya post publik yang terlihat bagi pembaca ini, jadi post terhapus, disembunyikan, penulis BANNED,
   * dan pasangan blokir tidak ikut (aturan terpusat di VisibilityService).
   */
  async trending(viewerId: string): Promise<{ items: TrendingTag[] }> {
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
    // Seri (jumlah sama) diurut menurut nama tag, bukan id: id acak tidak bermakna bagi pembaca.
    const items = rows
      .map((r) => ({ tag: byId.get(r.hashtagId)!, count: r._count.postId }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    return { items }
  }

  /** POST-10: post publik dengan hashtag ini; tag tidak dikenal memberi daftar kosong (tidak membocorkan apa pun). */
  async byHashtag(
    viewerId: string,
    tag: string,
    limit: number,
    cursor?: string,
  ): Promise<Paged<PostDto>> {
    const rows = await this.prisma.post.findMany({
      where: {
        AND: [
          this.visibility.postWhere(viewerId),
          publicPost,
          { hashtags: { some: { hashtag: { tag: tag.toLowerCase() } } } },
        ],
      },
      orderBy: NEWEST_FIRST,
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
   * SRC-05: cari isi post (mengandung kata kunci, tanpa membedakan huruf besar kecil). Himpunan post
   * tetap `postWhere` (privasi, blokir, BANNED, hidden, grup), jadi hasil tidak pernah lebih luas dari yang
   * boleh dibaca pembaca. Dua tahap (T-88): kandidat id lewat LIKE murah, lalu `postWhere` hanya pada
   * kandidat; menggabungkan keduanya membuat MySQL menjalankan subquery visibilitas pada setiap baris
   * (p95 1,4 detik pada 5.000 post). Urut id terbaru dulu; kursor = id.
   * shortcut: LIKE '%q%' tanpa indeks dan pemindaian dibatasi SEARCH_MAX_BATCHES x SEARCH_BATCH kandidat
   * per permintaan; ganti ke FULLTEXT bila tabel besar.
   */
  async search(
    viewerId: string,
    q: string,
    limit: number,
    cursor?: string,
  ): Promise<Paged<PostDto>> {
    const visible = this.visibility.postWhere(viewerId, true)
    const like = escapeLike(q)
    const found: PostRow[] = []
    // Kursor = id post terakhir yang sudah dipindai; posisinya dicari lewat (createdAt, id)-nya.
    let before: { id: string; createdAt: Date } | null = null
    if (cursor) {
      before = await this.prisma.post.findUnique({
        where: { id: cursor },
        select: { id: true, createdAt: true },
      })
      if (!before) return { items: [], nextCursor: null }
    }
    let scanned = false
    for (let batch = 0; batch < SEARCH_MAX_BATCHES; batch++) {
      const candidates: { id: string; createdAt: Date }[] = await this.prisma.post.findMany({
        where: {
          content: { contains: like },
          deletedAt: null,
          ...(before ? afterCursor(before) : {}),
        },
        orderBy: NEWEST_FIRST,
        take: SEARCH_BATCH,
        select: { id: true, createdAt: true },
      })
      if (candidates.length === 0) {
        scanned = true
        break
      }
      before = candidates[candidates.length - 1]!
      const rows = await this.prisma.post.findMany({
        where: { AND: [{ id: { in: candidates.map((c) => c.id) } }, visible] },
        orderBy: NEWEST_FIRST,
        take: limit + 1 - found.length,
        include: this.include(viewerId),
      })
      found.push(...rows)
      if (found.length > limit || candidates.length < SEARCH_BATCH) {
        scanned = candidates.length < SEARCH_BATCH && found.length <= limit
        break
      }
    }
    const page = found.slice(0, limit)
    // Lebih dari satu halaman: lanjut dari post terakhir. Batas pindai tercapai tanpa cukup hasil: lanjut dari
    // kandidat terakhir yang diperiksa (bukan dari hasil) supaya klien bisa meminta halaman berikutnya.
    const nextCursor =
      found.length > limit ? page[page.length - 1]!.id : scanned ? null : (before?.id ?? null)
    return { items: await this.toDtos(viewerId, page), nextCursor }
  }

  /** SAV-01: simpan post (idempoten). Post harus terlihat bagi pembaca; selain itu 404 yang sama. */
  async save(viewerId: string, id: string): Promise<{ savedByMe: boolean }> {
    await this.findVisible(viewerId, id)
    await this.prisma.savedPost.upsert({
      where: { userId_postId: { userId: viewerId, postId: id } },
      create: { userId: viewerId, postId: id },
      // Simpan ulang menaikkan post ke atas daftar /saved (urut menurut waktu simpan).
      update: { createdAt: new Date() },
    })
    return { savedByMe: true }
  }

  /** Batal simpan (idempoten); tidak perlu cek visibilitas karena hanya menghapus baris milik sendiri. */
  async unsave(viewerId: string, id: string): Promise<{ savedByMe: boolean }> {
    await this.prisma.savedPost.deleteMany({ where: { userId: viewerId, postId: id } })
    return { savedByMe: false }
  }

  /** SAV-01: daftar simpanan, terbaru disimpan dulu; yang kini tak terlihat disaring VisibilityService. */
  async saved(viewerId: string, limit: number, cursor?: string): Promise<Paged<PostDto>> {
    // Urut menurut waktu simpan (saved_posts.created_at, post_id); kursor = id post terakhir halaman sebelumnya.
    const rows = await this.prisma.savedPost.findMany({
      where: { userId: viewerId, post: this.visibility.postWhere(viewerId, true) },
      orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
      take: limit + 1,
      ...(cursor
        ? { cursor: { userId_postId: { userId: viewerId, postId: cursor } }, skip: 1 }
        : {}),
      include: { post: { include: this.include(viewerId) } },
    })
    const page = rows.slice(0, limit)
    return {
      items: await this.toDtos(
        viewerId,
        page.map((r) => r.post),
      ),
      nextCursor: rows.length > limit ? page[page.length - 1]!.postId : null,
    }
  }

  /**
   * OTD-01 (On This Day): post pemilik di hari dan bulan yang sama pada tahun-tahun sebelumnya (UTC),
   * hanya yang boleh dibaca pembaca. Pemilik = viewer sendiri, jadi aturan privasi tetap lewat postWhere.
   * shortcut: satu query kandidat 1 hari per tahun lewat rentang OR; paling banyak puluhan tahun.
   */
  async onThisDay(viewerId: string, now = new Date()): Promise<{ items: PostDto[] }> {
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const d = now.getUTCDate()
    const earliest = await this.prisma.post.aggregate({
      where: { authorId: viewerId, deletedAt: null },
      _min: { createdAt: true },
    })
    const first = earliest._min.createdAt?.getUTCFullYear()
    if (first === undefined) return { items: [] }
    const days: Prisma.PostWhereInput[] = []
    for (let year = y - 1; year >= first; year--) {
      const start = new Date(Date.UTC(year, m, d))
      // 29 Feb tidak ada di tahun biasa: Date.UTC meluap ke 1 Mar, lewati supaya tidak salah hari.
      if (start.getUTCMonth() !== m) continue
      days.push({ createdAt: { gte: start, lt: new Date(Date.UTC(year, m, d + 1)) } })
    }
    if (days.length === 0) return { items: [] }
    const rows = await this.prisma.post.findMany({
      where: {
        AND: [this.visibility.postWhere(viewerId), { authorId: viewerId }, { OR: days }],
      },
      orderBy: NEWEST_FIRST,
      take: 50,
      include: this.include(viewerId),
    })
    return { items: await this.toDtos(viewerId, rows) }
  }

  /**
   * YIR-01: ringkasan tahun (UTC) milik viewer sendiri. Semua hitungan memakai himpunan post yang lolos
   * postWhere, dan like/komentar menyaring pelaku BANNED/terhapus/terblokir seperti di tempat lain.
   * Tahun tanpa post tetap dijawab (angka 0, topPost null); yang diminta bukan tahun valid: 400 di DTO.
   */
  async yearInReview(viewerId: string, year: number): Promise<YearInReview> {
    const mine: Prisma.PostWhereInput = {
      AND: [this.visibility.postWhere(viewerId), { authorId: viewerId }, yearRange(year)],
    }
    const ids = (await this.prisma.post.findMany({ where: mine, select: { id: true } })).map(
      (p) => p.id,
    )
    const [photoCount, likeCount, commentCount, top, years] = await Promise.all([
      this.prisma.post.count({ where: { AND: [mine, { imageUrl: { not: null } }] } }),
      this.prisma.like.count({
        where: { postId: { in: ids }, ...this.visibility.likerWhere(viewerId) },
      }),
      this.prisma.comment.count({
        where: { postId: { in: ids }, ...this.visibility.commentWhere(viewerId) },
      }),
      this.prisma.post.findFirst({
        where: mine,
        orderBy: [{ likes: { _count: 'desc' } }, { id: 'desc' }],
        include: this.include(viewerId),
      }),
      this.timelineYears(viewerId, viewerId),
    ])
    return {
      year,
      years,
      postCount: ids.length,
      photoCount,
      likeCount,
      commentCount,
      topPost: top ? (await this.toDtos(viewerId, [top]))[0]! : null,
    }
  }

  /** Timeline profil: post `authorId` yang boleh dibaca viewer (aturan yang sama dengan feed). */
  async timeline(
    viewerId: string,
    authorId: string,
    limit: number,
    cursor?: string,
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
      orderBy: NEWEST_FIRST,
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
  async timelineYears(viewerId: string, authorId: string): Promise<number[]> {
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
  private async resolveWallOwner(viewerId: string, username: string) {
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
  private async resolveTags(viewerId: string, ids: string[]): Promise<string[]> {
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
    postId: string,
    actorId: string,
    wallOwnerId: string | null,
    tagIds: string[],
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
  private async findVisible(viewerId: string, id: string): Promise<PostRow> {
    const row = await this.prisma.post.findFirst({
      where: { AND: [{ id }, this.visibility.postWhere(viewerId, true)] },
      include: this.include(viewerId),
    })
    if (!row) throw notFound()
    return row
  }

  private include(viewerId: string) {
    return postInclude(this.visibility.likerWhere(viewerId), this.visibility.userWhere(viewerId))
  }

  private async assertUpload(imageUrl: string | null) {
    if (imageUrl && !(await this.uploads.exists(imageUrl))) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Gambar tidak ditemukan; unggah ulang')
    }
  }

  /** Id teman ACCEPTED viewer (dua arah) untuk mempersempit kandidat feed lewat indeks. */
  private async friendIds(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: viewerId }, { addresseeId: viewerId }] },
      select: { requesterId: true, addresseeId: true },
    })
    return rows.map((r) => (r.requesterId === viewerId ? r.addresseeId : r.requesterId))
  }

  /** Jumlah like dan komentar yang terlihat bagi viewer untuk satu halaman post (dua query terindeks). */
  private async counts(viewerId: string, ids: string[]) {
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

  private async toDtos(viewerId: string, rows: PostRow[]): Promise<PostDto[]> {
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
    const saved = await this.prisma.savedPost.findMany({
      where: { userId: viewerId, postId: { in: rows.map((r) => r.id) } },
      select: { postId: true },
    })
    const savedIds = new Set(saved.map((x) => x.postId))

    // Post asal untuk share: hanya yang boleh dilihat pembaca ini (aturan terpusat); selebihnya "tidak tersedia".
    const sharedIds = [
      ...new Set(rows.map((r) => r.sharedFromId).filter((x): x is string => x !== null)),
    ]
    const shared = new Map<string, SharedPost>()
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
    return rows.map((r) => this.toDto(r, likedIds, savedIds, shared, counts))
  }

  private toDto(
    row: PostRow,
    likedIds: Set<string | null>,
    savedIds: Set<string>,
    shared: Map<string, SharedPost>,
    counts?: { likes: Map<string | null, number>; comments: Map<string, number> },
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
      savedByMe: savedIds.has(row.id),
      likedPreview: row.likes.map((l) => l.user as UserSummary),
      editedAt: row.editedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }
  }
}
