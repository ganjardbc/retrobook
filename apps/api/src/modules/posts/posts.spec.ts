// Tes integrasi ke MySQL uji. Menguji post dan aturan visibilitas (docs/07-test-plan.md 3.3).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'rb-posts-'))

import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { Privacy, User, UserStatus } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { PrismaService } from '../../prisma/prisma.service'
import { resetDb } from '../../test/db'
import { MISSING_ID, seqTime } from '../../test/helpers'
import { pairOf } from '../friends/pair'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

describe('Posts dan visibilitas (integrasi)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwt: JwtService
  let n = 0

  const mkUser = (name: string, extra: Partial<User> = {}) =>
    prisma.user.create({
      data: {
        email: `${name}${++n}@example.com`,
        username: `${name}${n}`,
        displayName: name,
        passwordHash: 'x',
        ...extra,
      },
    })
  const tokenOf = (u: User) => jwt.sign({ sub: u.id, role: u.role })
  const api = (u: User) => ({
    get: (p: string) =>
      request(app.getHttpServer())
        .get(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
    post: (p: string) =>
      request(app.getHttpServer())
        .post(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
    patch: (p: string) =>
      request(app.getHttpServer())
        .patch(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
    del: (p: string) =>
      request(app.getHttpServer())
        .delete(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
  })
  const befriend = (a: User, b: User, status: 'ACCEPTED' | 'PENDING' = 'ACCEPTED') =>
    prisma.friendship.create({
      data: {
        requesterId: a.id,
        addresseeId: b.id,
        ...pairOf(a.id, b.id),
        status,
      },
    })

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    jwt = app.get(JwtService)
  })
  beforeEach(() => resetDb(prisma))
  afterAll(async () => {
    await resetDb(prisma)
    await app.close()
    rmSync(process.env.UPLOAD_DIR!, { recursive: true, force: true })
  })

  describe('buat post (POST-01, POST-03)', () => {
    it('berhasil; privasi default FRIENDS; bentuk objek sesuai kontrak', async () => {
      const alice = await mkUser('alice')
      const res = await api(alice).post('/posts').send({ content: 'Halo 2015' })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        content: 'Halo 2015',
        privacy: 'FRIENDS',
        imageUrl: null,
        author: { id: alice.id, username: alice.username, isBot: false },
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        likedPreview: [],
        wallOwner: null,
        sharedFrom: null,
        editedAt: null,
      })
      expect(res.body.author.passwordHash).toBeUndefined()
      expect(res.body.author.email).toBeUndefined()
    })

    it('menerima feeling dari daftar tetap dan menolak nilai lain', async () => {
      const alice = await mkUser('alice')
      const created = await api(alice)
        .post('/posts')
        .send({ content: 'halo', feeling: 'feeling happy' })
      expect(created.status).toBe(201)
      expect(created.body.feeling).toBe('feeling happy')
      const invalid = await api(alice).post('/posts').send({ content: 'halo', feeling: 'whatever' })
      expect(invalid.status).toBe(400)
    })

    it('5.000 karakter lolos, 5.001 ditolak', async () => {
      const alice = await mkUser('alice')
      expect(
        (
          await api(alice)
            .post('/posts')
            .send({ content: 'a'.repeat(5000) })
        ).status,
      ).toBe(201)
      const res = await api(alice)
        .post('/posts')
        .send({ content: 'a'.repeat(5001) })
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_FAILED')
    })

    it.each([[{}], [{ content: '' }], [{ content: '   \n ' }]])(
      'kosong tanpa gambar ditolak: %j',
      async (body) => {
        const alice = await mkUser('alice')
        const res = await api(alice).post('/posts').send(body)
        expect(res.status).toBe(400)
      },
    )

    it('gambar tanpa teks diterima bila hasil unggahan nyata', async () => {
      const alice = await mkUser('alice')
      const up = await request(app.getHttpServer())
        .post('/api/uploads/post-image')
        .set('Authorization', `Bearer ${tokenOf(alice)}`)
        .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
      const res = await api(alice).post('/posts').send({ imageUrl: up.body.url })
      expect(res.status).toBe(201)
      expect(res.body.imageUrl).toBe(up.body.url)
      expect(res.body.content).toBe('')
    })

    it.each([
      ['URL luar', 'https://evil.example/x.png'],
      ['javascript:', 'javascript:alert(1)'],
      ['path traversal', '/uploads/../../etc/passwd'],
      ['nama bukan hasil unggahan', '/uploads/abc.png'],
    ])('imageUrl ditolak: %s', async (_n, imageUrl) => {
      const alice = await mkUser('alice')
      const res = await api(alice).post('/posts').send({ content: 'x', imageUrl })
      expect(res.status).toBe(400)
    })

    it('imageUrl berformat benar tapi berkas tidak ada: 400', async () => {
      const alice = await mkUser('alice')
      const res = await api(alice)
        .post('/posts')
        .send({ content: 'x', imageUrl: `/uploads/${'a'.repeat(32)}.png` })
      expect(res.status).toBe(400)
    })

    it('privasi di luar enum dan field asing (authorId) ditolak', async () => {
      const alice = await mkUser('alice')
      expect(
        (await api(alice).post('/posts').send({ content: 'x', privacy: 'SECRET' })).status,
      ).toBe(400)
      expect((await api(alice).post('/posts').send({ content: 'x', authorId: 99 })).status).toBe(
        400,
      )
    })

    it('tanpa login: 401', async () => {
      expect(
        (await request(app.getHttpServer()).post('/api/posts').send({ content: 'x' })).status,
      ).toBe(401)
    })
  })

  describe('visibilitas GET /posts/:id (BR-02, 03, 05, 07, R-03)', () => {
    type Who = 'alice' | 'friend' | 'friendIncoming' | 'pending' | 'stranger'
    // Pertemanan dibuat dua arah: friend = alice mengirim, friendIncoming = alice menerima.
    const setup = async (
      post: { privacy: Privacy; hidden?: boolean; deletedAt?: Date | null },
      authorExtra: Partial<User> = {},
    ) => {
      const alice = await mkUser('alice', authorExtra)
      const friend = await mkUser('friend')
      const friendIncoming = await mkUser('friendin')
      const pending = await mkUser('pending')
      const stranger = await mkUser('stranger')
      await befriend(alice, friend)
      await befriend(friendIncoming, alice)
      await befriend(pending, alice, 'PENDING')
      const row = await prisma.post.create({
        data: { authorId: alice.id, content: 'rahasia', ...post },
      })
      const users: Record<Who, User> = { alice, friend, friendIncoming, pending, stranger }
      return { row, users }
    }
    const seen = async (u: User, id: string) => (await api(u).get(`/posts/${id}`)).status === 200

    const cases: [
      string,
      { privacy: Privacy; hidden?: boolean; deletedAt?: Date },
      Partial<User>,
      Record<Who, boolean>,
    ][] = [
      [
        'PUBLIC',
        { privacy: 'PUBLIC' },
        {},
        { alice: true, friend: true, friendIncoming: true, pending: true, stranger: true },
      ],
      [
        'FRIENDS',
        { privacy: 'FRIENDS' },
        {},
        { alice: true, friend: true, friendIncoming: true, pending: false, stranger: false },
      ],
      [
        'ONLY_ME',
        { privacy: 'ONLY_ME' },
        {},
        { alice: true, friend: false, friendIncoming: false, pending: false, stranger: false },
      ],
      [
        'PUBLIC hidden',
        { privacy: 'PUBLIC', hidden: true },
        {},
        { alice: true, friend: false, friendIncoming: false, pending: false, stranger: false },
      ],
      [
        'FRIENDS hidden',
        { privacy: 'FRIENDS', hidden: true },
        {},
        { alice: true, friend: false, friendIncoming: false, pending: false, stranger: false },
      ],
      [
        'PUBLIC soft-deleted',
        { privacy: 'PUBLIC', deletedAt: new Date() },
        {},
        { alice: false, friend: false, friendIncoming: false, pending: false, stranger: false },
      ],
      [
        'PUBLIC, penulis BANNED',
        { privacy: 'PUBLIC' },
        { status: UserStatus.BANNED },
        { alice: false, friend: false, friendIncoming: false, pending: false, stranger: false },
      ],
      [
        'PUBLIC, penulis SUSPENDED (konten tetap tampil, BR-05)',
        { privacy: 'PUBLIC' },
        { status: UserStatus.SUSPENDED },
        { alice: true, friend: true, friendIncoming: true, pending: true, stranger: true },
      ],
      [
        'PUBLIC, penulis terhapus',
        { privacy: 'PUBLIC' },
        { deletedAt: new Date() },
        { alice: false, friend: false, friendIncoming: false, pending: false, stranger: false },
      ],
    ]

    it.each(cases)('%s', async (_name, post, authorExtra, expected) => {
      const { row, users } = await setup(post, authorExtra)
      for (const who of Object.keys(expected) as Who[]) {
        // Penulis BANNED/SUSPENDED tidak bisa memakai API (guard menolak 403), jadi sisi "penulis" dilewati.
        if (who === 'alice' && authorExtra.status) continue
        expect({ who, seen: await seen(users[who], row.id) }).toEqual({ who, seen: expected[who] })
      }
    })

    it('404 identik untuk "tidak ada" dan "tidak boleh lihat" (tidak membocorkan keberadaan)', async () => {
      const { row, users } = await setup({ privacy: 'ONLY_ME' })
      const hidden = await api(users.stranger).get(`/posts/${row.id}`)
      const missing = await api(users.stranger).get(`/posts/${MISSING_ID}`)
      expect(hidden.status).toBe(404)
      expect(hidden.body).toEqual(missing.body)
    })

    it('unfriend: post FRIENDS langsung hilang', async () => {
      const { row, users } = await setup({ privacy: 'FRIENDS' })
      expect(await seen(users.friend, row.id)).toBe(true)
      await prisma.friendship.deleteMany()
      expect(await seen(users.friend, row.id)).toBe(false)
    })

    it('tamu (tanpa token): 401', async () => {
      const { row } = await setup({ privacy: 'PUBLIC' })
      expect((await request(app.getHttpServer()).get(`/api/posts/${row.id}`)).status).toBe(401)
    })

    it('id bukan angka: 400', async () => {
      const alice = await mkUser('alice')
      expect((await api(alice).get('/posts/abc')).status).toBe(400)
    })
  })

  describe('feed (POST-04)', () => {
    it('hanya post sendiri dan teman, terbaru di atas; bukan post PUBLIC orang asing', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const carol = await mkUser('carol')
      await befriend(alice, bob)
      const at = seqTime()
      const mine = await prisma.post.create({
        data: { authorId: alice.id, content: 'mine', privacy: 'ONLY_ME', createdAt: at() },
      })
      const bobs = await prisma.post.create({
        data: { authorId: bob.id, content: 'bobs', privacy: 'FRIENDS', createdAt: at() },
      })
      await prisma.post.create({
        data: { authorId: bob.id, content: 'bob-only-me', privacy: 'ONLY_ME' },
      })
      await prisma.post.create({
        data: { authorId: carol.id, content: 'carol-public', privacy: 'PUBLIC' },
      })
      const res = await api(alice).get('/feed')
      expect(res.status).toBe(200)
      expect(res.body.items.map((p: { id: string }) => p.id)).toEqual([bobs.id, mine.id])
      expect(res.body.nextCursor).toBeNull()
    })

    it('pagination kursor: 10 per halaman, urut, tanpa duplikat, stabil saat ada post baru', async () => {
      const alice = await mkUser('alice')
      const at = seqTime()
      for (let i = 1; i <= 25; i++) {
        await prisma.post.create({
          data: { authorId: alice.id, content: `p${i}`, privacy: 'PUBLIC', createdAt: at() },
        })
      }
      const p1 = (await api(alice).get('/feed')).body
      expect(p1.items).toHaveLength(10)
      expect(p1.items[0].content).toBe('p25')
      expect(p1.nextCursor).toBe(p1.items[9].id)

      await prisma.post.create({ data: { authorId: alice.id, content: 'baru', privacy: 'PUBLIC' } })
      const p2 = (await api(alice).get(`/feed?cursor=${p1.nextCursor}`)).body
      expect(p2.items).toHaveLength(10)
      expect(p2.items[0].content).toBe('p15')
      const p3 = (await api(alice).get(`/feed?cursor=${p2.nextCursor}`)).body
      expect(p3.items.map((p: { content: string }) => p.content)).toEqual([
        'p5',
        'p4',
        'p3',
        'p2',
        'p1',
      ])
      expect(p3.nextCursor).toBeNull()
    })

    it('limit dibatasi 1 sampai 50', async () => {
      const alice = await mkUser('alice')
      expect((await api(alice).get('/feed?limit=0')).status).toBe(400)
      expect((await api(alice).get('/feed?limit=51')).status).toBe(400)
      expect((await api(alice).get('/feed?limit=50')).status).toBe(200)
    })

    it('post terhapus, hidden milik teman, dan penulis BANNED tidak muncul', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const banned = await mkUser('banned', { status: 'BANNED' })
      await befriend(alice, bob)
      await befriend(alice, banned)
      await prisma.post.create({
        data: { authorId: bob.id, content: 'deleted', privacy: 'FRIENDS', deletedAt: new Date() },
      })
      await prisma.post.create({
        data: { authorId: bob.id, content: 'hidden', privacy: 'FRIENDS', hidden: true },
      })
      await prisma.post.create({
        data: { authorId: banned.id, content: 'banned', privacy: 'FRIENDS' },
      })
      const ok = await prisma.post.create({
        data: { authorId: bob.id, content: 'ok', privacy: 'FRIENDS' },
      })
      const res = await api(alice).get('/feed')
      expect(res.body.items.map((p: { id: string }) => p.id)).toEqual([ok.id])
    })

    it('hitungan like dan komentar, likedByMe, dan pratinjau penyuka', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const carol = await mkUser('carol')
      const post = await prisma.post.create({
        data: { authorId: alice.id, content: 'x', privacy: 'PUBLIC' },
      })
      await prisma.like.createMany({
        data: [bob, carol, alice].map((u) => ({ userId: u.id, postId: post.id })),
      })
      await prisma.comment.create({ data: { postId: post.id, authorId: bob.id, content: 'c1' } })
      await prisma.comment.create({
        data: { postId: post.id, authorId: bob.id, content: 'dihapus', deletedAt: new Date() },
      })
      await prisma.comment.create({
        data: { postId: post.id, authorId: bob.id, content: 'disembunyikan', hidden: true },
      })
      const p = (await api(alice).get('/feed')).body.items[0]
      expect(p).toMatchObject({ likeCount: 3, commentCount: 1, likedByMe: true })
      expect(p.likedPreview).toHaveLength(2)
      const notLiker = (await api(bob).get(`/posts/${post.id}`)).body
      expect(notLiker.likedByMe).toBe(true) // bob menyukai
      const dave = await mkUser('dave')
      expect((await api(dave).get(`/posts/${post.id}`)).body.likedByMe).toBe(false)
    })
  })

  describe('edit dan hapus (POST-05, POST-06)', () => {
    it('pemilik mengubah isi dan privasi; editedAt terisi', async () => {
      const alice = await mkUser('alice')
      const post = (await api(alice).post('/posts').send({ content: 'lama' })).body
      const res = await api(alice)
        .patch(`/posts/${post.id}`)
        .send({ content: 'baru', privacy: 'PUBLIC' })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ content: 'baru', privacy: 'PUBLIC' })
      expect(res.body.editedAt).toEqual(expect.any(String))
    })

    it('bukan pemilik: 403 bila terlihat, 404 bila tak terlihat; isi tidak berubah', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const pub = await prisma.post.create({
        data: { authorId: alice.id, content: 'pub', privacy: 'PUBLIC' },
      })
      const priv = await prisma.post.create({
        data: { authorId: alice.id, content: 'priv', privacy: 'ONLY_ME' },
      })
      expect((await api(bob).patch(`/posts/${pub.id}`).send({ content: 'hack' })).status).toBe(403)
      expect((await api(bob).del(`/posts/${pub.id}`)).status).toBe(403)
      expect((await api(bob).patch(`/posts/${priv.id}`).send({ content: 'hack' })).status).toBe(404)
      expect((await api(bob).del(`/posts/${priv.id}`)).status).toBe(404)
      expect((await prisma.post.findUniqueOrThrow({ where: { id: pub.id } })).content).toBe('pub')
      expect((await prisma.post.findUniqueOrThrow({ where: { id: priv.id } })).deletedAt).toBeNull()
    })

    it('tidak boleh mengosongkan post tanpa gambar; imageUrl null menghapus gambar', async () => {
      const alice = await mkUser('alice')
      const post = (await api(alice).post('/posts').send({ content: 'x' })).body
      expect((await api(alice).patch(`/posts/${post.id}`).send({ content: '' })).status).toBe(400)
      const ok = await api(alice).patch(`/posts/${post.id}`).send({ imageUrl: null })
      expect(ok.status).toBe(200)
      expect(ok.body.imageUrl).toBeNull()
    })

    it('field asing (authorId, hidden) ditolak', async () => {
      const alice = await mkUser('alice')
      const post = (await api(alice).post('/posts').send({ content: 'x' })).body
      expect((await api(alice).patch(`/posts/${post.id}`).send({ hidden: true })).status).toBe(400)
      expect((await api(alice).patch(`/posts/${post.id}`).send({ authorId: 5 })).status).toBe(400)
    })

    it('hapus = soft delete: 204, hilang dari semua pembaca, baris tetap ada', async () => {
      const alice = await mkUser('alice')
      const post = (await api(alice).post('/posts').send({ content: 'x', privacy: 'PUBLIC' })).body
      expect((await api(alice).del(`/posts/${post.id}`)).status).toBe(204)
      expect((await api(alice).get(`/posts/${post.id}`)).status).toBe(404)
      expect((await api(alice).get('/feed')).body.items).toHaveLength(0)
      expect((await api(alice).patch(`/posts/${post.id}`).send({ content: 'y' })).status).toBe(404)
      expect(
        (await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).deletedAt,
      ).not.toBeNull()
    })
  })
})
