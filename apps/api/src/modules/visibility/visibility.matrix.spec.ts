// Matriks privasi (docs/07-test-plan.md 3.3, risiko R-03). Ekspektasi ditulis dari TABEL ATURAN di
// dokumen (fungsi `shouldSee` di bawah), bukan dari implementasi, lalu diuji ke SETIAP endpoint pembaca.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Privacy, User, UserStatus } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

type ViewerKey = 'owner' | 'friendOut' | 'friendIn' | 'pendingOut' | 'pendingIn' | 'stranger'
type PostState = {
  name: string
  privacy: Privacy
  hidden?: boolean
  deleted?: boolean
  authorStatus?: UserStatus
  authorDeleted?: boolean
}

const VIEWERS: ViewerKey[] = [
  'owner',
  'friendOut',
  'friendIn',
  'pendingOut',
  'pendingIn',
  'stranger',
]
const isFriend = (v: ViewerKey) => v === 'friendOut' || v === 'friendIn'

const STATES: PostState[] = [
  { name: 'PUBLIC', privacy: 'PUBLIC' },
  { name: 'FRIENDS', privacy: 'FRIENDS' },
  { name: 'ONLY_ME', privacy: 'ONLY_ME' },
  { name: 'PUBLIC + hidden', privacy: 'PUBLIC', hidden: true },
  { name: 'FRIENDS + hidden', privacy: 'FRIENDS', hidden: true },
  { name: 'ONLY_ME + hidden', privacy: 'ONLY_ME', hidden: true },
  { name: 'PUBLIC + soft-deleted', privacy: 'PUBLIC', deleted: true },
  { name: 'FRIENDS + soft-deleted', privacy: 'FRIENDS', deleted: true },
  { name: 'PUBLIC, penulis BANNED', privacy: 'PUBLIC', authorStatus: 'BANNED' },
  { name: 'FRIENDS, penulis BANNED', privacy: 'FRIENDS', authorStatus: 'BANNED' },
  {
    name: 'PUBLIC, penulis SUSPENDED (konten tetap tampil)',
    privacy: 'PUBLIC',
    authorStatus: 'SUSPENDED',
  },
  {
    name: 'FRIENDS, penulis SUSPENDED (konten tetap tampil)',
    privacy: 'FRIENDS',
    authorStatus: 'SUSPENDED',
  },
  { name: 'PUBLIC, penulis terhapus', privacy: 'PUBLIC', authorDeleted: true },
]

/** Aturan dari dokumen: BR-02, 03, 05, 06, 07. Pemilik BANNED/SUSPENDED/terhapus tidak bisa memakai API sama sekali. */
function shouldSee(s: PostState, v: ViewerKey): boolean {
  if (s.deleted) return false
  if (s.authorStatus === 'BANNED' || s.authorDeleted) return false
  if (v === 'owner') return true
  if (s.hidden) return false
  if (s.privacy === 'PUBLIC') return true
  if (s.privacy === 'FRIENDS') return isFriend(v)
  return false
}
/** Penulis yang tak bisa memakai API: status guard yang diharapkan pada semua permintaannya. */
function ownerGuardStatus(s: PostState): number | null {
  if (s.authorDeleted) return 401
  if (s.authorStatus === 'BANNED' || s.authorStatus === 'SUSPENDED') return 403
  return null
}

describe('Matriks privasi: setiap endpoint pembaca (R-03)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    h = testHelpers(app)
  })
  beforeEach(() => resetDb(h.prisma))
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  async function world(s: PostState) {
    const owner = await h.mkUser('owner', {
      status: s.authorStatus ?? 'ACTIVE',
      deletedAt: s.authorDeleted ? new Date() : null,
    })
    const users: Record<ViewerKey, User> = {
      owner,
      friendOut: await h.mkUser('friendout'),
      friendIn: await h.mkUser('friendin'),
      pendingOut: await h.mkUser('pendingout'),
      pendingIn: await h.mkUser('pendingin'),
      stranger: await h.mkUser('stranger'),
    }
    await h.befriend(owner, users.friendOut) // owner mengirim, diterima
    await h.befriend(users.friendIn, owner) // teman mengirim, diterima
    await h.befriend(owner, users.pendingOut, 'PENDING')
    await h.befriend(users.pendingIn, owner, 'PENDING')
    const post = await h.prisma.post.create({
      data: {
        authorId: owner.id,
        content: 'isi rahasia',
        imageUrl: `/uploads/${'a'.repeat(32)}.png`,
        privacy: s.privacy,
        hidden: s.hidden ?? false,
        deletedAt: s.deleted ? new Date() : null,
      },
    })
    // satu komentar dan satu like dari teman, supaya daftar komentar/penyuka punya isi yang bisa bocor
    await h.prisma.comment.create({
      data: { postId: post.id, authorId: users.friendOut.id, content: 'komentar rahasia' },
    })
    await h.prisma.like.create({ data: { userId: users.friendOut.id, postId: post.id } })
    return { users, post }
  }

  describe.each(STATES)('$name', (state) => {
    it('semua endpoint pembaca dan penulis konsisten untuk setiap penonton', async () => {
      const { users, post } = await world(state)
      const problems: string[] = []
      const expect404 = (who: string, ep: string, status: number) => {
        if (status !== 404) problems.push(`${who} ${ep}: seharusnya 404, dapat ${status}`)
      }

      for (const v of VIEWERS) {
        const u = users[v]
        const api = h.as(u)
        const guard = v === 'owner' ? ownerGuardStatus(state) : null
        const see = shouldSee(state, v)

        // --- pembaca ---
        const detail = await api.get(`/posts/${post.id}`)
        const comments = await api.get(`/posts/${post.id}/comments`)
        const likes = await api.get(`/posts/${post.id}/likes`)
        const feed = await api.get('/feed?limit=50')
        const timeline = await api.get(`/users/${users.owner.username}/posts?limit=50`)
        const photos = await api.get(`/users/${users.owner.username}/photos?limit=50`)

        if (guard) {
          for (const [ep, r] of [
            ['detail', detail],
            ['komentar', comments],
            ['penyuka', likes],
            ['feed', feed],
            ['timeline', timeline],
            ['photos', photos],
          ] as const) {
            if (r.status !== guard)
              problems.push(`${v} ${ep}: guard seharusnya ${guard}, dapat ${r.status}`)
          }
          continue
        }

        const want = see ? 200 : 404
        for (const [ep, r] of [
          ['detail', detail],
          ['komentar', comments],
          ['penyuka', likes],
        ] as const) {
          if (r.status !== want) problems.push(`${v} ${ep}: seharusnya ${want}, dapat ${r.status}`)
        }
        if (see) {
          if (detail.body.content !== 'isi rahasia') problems.push(`${v} detail: isi tidak sesuai`)
        } else {
          // 404 harus identik dengan "post tidak ada" (tidak membocorkan keberadaan)
          const missing = await api.get('/posts/999999')
          if (JSON.stringify(detail.body) !== JSON.stringify(missing.body))
            problems.push(`${v} detail: 404 berbeda dari post yang tidak ada`)
          if (JSON.stringify(detail.body).includes('rahasia'))
            problems.push(`${v} detail: isi bocor di respons 404`)
          if (JSON.stringify(comments.body).includes('rahasia'))
            problems.push(`${v} komentar: isi bocor`)
          if (JSON.stringify(likes.body).includes('friendout'))
            problems.push(`${v} penyuka: data bocor`)
        }

        // feed hanya berisi post sendiri dan teman, dan hanya yang terlihat
        const inFeed = (feed.body.items ?? []).some((p: { id: number }) => p.id === post.id)
        const wantInFeed = see && (v === 'owner' || isFriend(v))
        if (feed.status !== 200) problems.push(`${v} feed: status ${feed.status}`)
        else if (inFeed !== wantInFeed)
          problems.push(
            `${v} feed: post ${inFeed ? 'ada' : 'tidak ada'}, seharusnya ${wantInFeed ? 'ada' : 'tidak ada'}`,
          )

        // timeline profil: profil penulis BANNED/terhapus 404; selain itu hanya berisi post yang terlihat
        const authorGone = state.authorStatus === 'BANNED' || state.authorDeleted
        const inTimeline = (timeline.body.items ?? []).some((p: { id: number }) => p.id === post.id)
        if (authorGone) {
          if (timeline.status !== 404)
            problems.push(
              `${v} timeline: profil penulis hilang seharusnya 404, dapat ${timeline.status}`,
            )
        } else if (timeline.status !== 200)
          problems.push(`${v} timeline: status ${timeline.status}`)
        else if (inTimeline !== see)
          problems.push(
            `${v} timeline: post ${inTimeline ? 'ada' : 'tidak ada'}, seharusnya ${see ? 'ada' : 'tidak ada'}`,
          )

        // tab Photos: aturan yang sama dengan timeline untuk post yang memiliki gambar
        const inPhotos = (photos.body.items ?? []).some(
          (p: { postId: number }) => p.postId === post.id,
        )
        if (authorGone) {
          if (photos.status !== 404)
            problems.push(
              `${v} photos: profil penulis hilang seharusnya 404, dapat ${photos.status}`,
            )
        } else if (photos.status !== 200) problems.push(`${v} photos: status ${photos.status}`)
        else if (inPhotos !== see)
          problems.push(
            `${v} photos: foto ${inPhotos ? 'ada' : 'tidak ada'}, seharusnya ${see ? 'ada' : 'tidak ada'}`,
          )

        // --- penulis (mutasi) ---
        const like = await api.put(`/posts/${post.id}/like`)
        if (see ? like.status !== 200 : (expect404(v, 'like', like.status), false))
          problems.push(`${v} like: seharusnya 200, dapat ${like.status}`)
        const comment = await api
          .post(`/posts/${post.id}/comments`)
          .send({ content: `halo dari ${v}` })
        if (see ? comment.status !== 201 : (expect404(v, 'komentar baru', comment.status), false))
          problems.push(`${v} komentar baru: seharusnya 201, dapat ${comment.status}`)
        const patch = await api.patch(`/posts/${post.id}`).send({ content: 'isi rahasia' })
        const wantPatch = !see ? 404 : v === 'owner' ? 200 : 403
        if (patch.status !== wantPatch)
          problems.push(`${v} edit: seharusnya ${wantPatch}, dapat ${patch.status}`)
      }

      // tidak ada baris yang tercipta oleh permintaan yang ditolak
      const strangers = [users.pendingOut.id, users.pendingIn.id, users.stranger.id]
      const leaked = await h.prisma.comment.count({
        where: { postId: post.id, authorId: { in: strangers } },
      })
      const leakedLikes = await h.prisma.like.count({
        where: { postId: post.id, userId: { in: strangers } },
      })
      const expectWritten = (v: ViewerKey) => shouldSee(state, v)
      const wantComments = ([users.pendingOut, users.pendingIn, users.stranger] as User[]).filter(
        (_, i) => expectWritten((['pendingOut', 'pendingIn', 'stranger'] as ViewerKey[])[i]!),
      ).length
      if (leaked !== wantComments)
        problems.push(
          `komentar tercipta dari penonton tak berhak: ${leaked}, seharusnya ${wantComments}`,
        )
      if (leakedLikes !== wantComments)
        problems.push(
          `like tercipta dari penonton tak berhak: ${leakedLikes}, seharusnya ${wantComments}`,
        )

      expect(problems).toEqual([])
    })
  })

  it('tamu (tanpa token): 401 di semua endpoint pembaca dan penulis', async () => {
    const { post } = await world({ name: 'x', privacy: 'PUBLIC' })
    const http = () => request(app.getHttpServer())
    const results = await Promise.all([
      http().get(`/api/posts/${post.id}`),
      http().get(`/api/posts/${post.id}/comments`),
      http().get(`/api/posts/${post.id}/likes`),
      http().get('/api/feed'),
      http().put(`/api/posts/${post.id}/like`),
      http().delete(`/api/posts/${post.id}/like`),
      http().post(`/api/posts/${post.id}/comments`).send({ content: 'x' }),
      http().patch(`/api/posts/${post.id}`).send({ content: 'x' }),
      http().delete(`/api/posts/${post.id}`),
    ])
    expect(results.map((r) => r.status)).toEqual(Array(9).fill(401))
  })

  describe('transisi: perubahan keadaan berlaku seketika', () => {
    it('edit privasi FRIENDS -> ONLY_ME: teman langsung kehilangan akses (detail, komentar, feed)', async () => {
      const { users, post } = await world({ name: 'x', privacy: 'FRIENDS' })
      expect((await h.as(users.friendOut).get(`/posts/${post.id}`)).status).toBe(200)
      expect(
        (await h.as(users.owner).patch(`/posts/${post.id}`).send({ privacy: 'ONLY_ME' })).status,
      ).toBe(200)
      expect((await h.as(users.friendOut).get(`/posts/${post.id}`)).status).toBe(404)
      expect((await h.as(users.friendOut).get(`/posts/${post.id}/comments`)).status).toBe(404)
      expect((await h.as(users.friendOut).get('/feed')).body.items).toEqual([])
    })

    it('edit privasi PUBLIC -> FRIENDS: orang asing kehilangan akses, teman tetap', async () => {
      const { users, post } = await world({ name: 'x', privacy: 'PUBLIC' })
      expect((await h.as(users.stranger).get(`/posts/${post.id}`)).status).toBe(200)
      await h.as(users.owner).patch(`/posts/${post.id}`).send({ privacy: 'FRIENDS' })
      expect((await h.as(users.stranger).get(`/posts/${post.id}`)).status).toBe(404)
      expect((await h.as(users.friendIn).get(`/posts/${post.id}`)).status).toBe(200)
    })

    it('permintaan teman diterima membuka post FRIENDS; unfriend menutupnya lagi', async () => {
      const { users, post } = await world({ name: 'x', privacy: 'FRIENDS' })
      const p = users.pendingIn
      expect((await h.as(p).get(`/posts/${post.id}`)).status).toBe(404)
      await h.prisma.friendship.updateMany({
        where: { requesterId: p.id, addresseeId: users.owner.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      })
      expect((await h.as(p).get(`/posts/${post.id}`)).status).toBe(200)
      expect((await h.as(p).get('/feed')).body.items.map((x: { id: number }) => x.id)).toEqual([
        post.id,
      ])
      await h.prisma.friendship.deleteMany({ where: { requesterId: p.id } })
      expect((await h.as(p).get(`/posts/${post.id}`)).status).toBe(404)
      expect((await h.as(p).get('/feed')).body.items).toEqual([])
    })

    it('admin menyembunyikan (hidden) post PUBLIC: hilang dari semua kecuali penulisnya', async () => {
      const { users, post } = await world({ name: 'x', privacy: 'PUBLIC' })
      await h.prisma.post.update({ where: { id: post.id }, data: { hidden: true } })
      for (const v of ['friendOut', 'stranger'] as ViewerKey[]) {
        expect((await h.as(users[v]).get(`/posts/${post.id}`)).status).toBe(404)
        expect((await h.as(users[v]).get('/feed')).body.items).toEqual([])
      }
      expect((await h.as(users.owner).get(`/posts/${post.id}`)).status).toBe(200)
    })

    it('penulis di-ban setelah memposting: post, komentar, dan like-nya hilang dari semua penonton', async () => {
      const { users, post } = await world({ name: 'x', privacy: 'PUBLIC' })
      expect((await h.as(users.friendOut).get('/feed')).body.items).toHaveLength(1)
      await h.prisma.user.update({ where: { id: users.owner.id }, data: { status: 'BANNED' } })
      expect((await h.as(users.friendOut).get(`/posts/${post.id}`)).status).toBe(404)
      expect((await h.as(users.friendOut).get('/feed')).body.items).toEqual([])
    })

    it('komentator di-ban: komentarnya hilang dari daftar dan hitungan, post tetap terlihat', async () => {
      const { users, post } = await world({ name: 'x', privacy: 'PUBLIC' })
      expect((await h.as(users.stranger).get(`/posts/${post.id}`)).body.commentCount).toBe(1)
      await h.prisma.user.update({ where: { id: users.friendOut.id }, data: { status: 'BANNED' } })
      const d = (await h.as(users.stranger).get(`/posts/${post.id}`)).body
      expect(d).toMatchObject({ commentCount: 0, likeCount: 0 })
      expect((await h.as(users.stranger).get(`/posts/${post.id}/comments`)).body.items).toEqual([])
    })
  })

  // Celah yang sengaja belum diuji karena fiturnya belum ada. Muncul sebagai "todo" di laporan tes
  // supaya tidak terlupa; ubah menjadi tes nyata saat tabel `blocks` dan wall post dibuat.
  describe('belum dapat diuji', () => {
    it.todo(
      'dave memblokir alice: PUBLIC milik alice tidak terlihat oleh dave (404) di semua endpoint, dan sebaliknya (BR-11, T-13/FRD-06)',
    )
    it.todo(
      'setelah blokir, pertemanan dan permintaan dihapus dan post FRIENDS langsung hilang (BR-11)',
    )
    it.todo(
      'hashtag memakai aturan yang sama (T-42); pencarian (T-39) dan notifikasi (T-32) diuji di spec masing-masing',
    )
  })
})
