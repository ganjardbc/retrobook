// Tes integrasi ke MySQL uji (POST-07).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Share post (integrasi)', () => {
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

  const world = async (privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME' = 'PUBLIC') => {
    const alice = await h.mkUser('alice') // penulis asli
    const bob = await h.mkUser('bob') // pembagi
    const carol = await h.mkUser('carol') // pembaca
    const post = await h.prisma.post.create({
      data: { authorId: alice.id, content: 'isi asli rahasia', imageUrl: null, privacy },
    })
    return { alice, bob, carol, post }
  }
  const share = (u: Parameters<typeof h.as>[0], id: number, body: object = {}) =>
    h.as(u).post(`/posts/${id}/share`).send(body)

  describe('membuat share', () => {
    it('201: post baru milik pembagi yang merujuk asal; privasi default FRIENDS; komentar opsional', async () => {
      const { alice, bob, post } = await world()
      const res = await share(bob, post.id, { content: 'Setuju banget' })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        author: { id: bob.id },
        content: 'Setuju banget',
        privacy: 'FRIENDS',
        imageUrl: null,
        likeCount: 0,
        commentCount: 0,
        sharedFrom: {
          id: post.id,
          author: { id: alice.id },
          content: 'isi asli rahasia',
          imageUrl: null,
        },
      })
      const row = await h.prisma.post.findUniqueOrThrow({ where: { id: res.body.id } })
      expect(row).toMatchObject({ authorId: bob.id, sharedFromId: post.id })
    })

    it('tanpa teks dan dengan privasi pilihan boleh; post asal tidak berubah', async () => {
      const { bob, post } = await world()
      const res = await share(bob, post.id, { privacy: 'PUBLIC' })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ content: '', privacy: 'PUBLIC' })
      expect(await h.prisma.post.count()).toBe(2)
      expect((await h.prisma.post.findUniqueOrThrow({ where: { id: post.id } })).content).toBe(
        'isi asli rahasia',
      )
    })

    it('membagikan post sendiri boleh', async () => {
      const { alice, post } = await world()
      expect((await share(alice, post.id)).status).toBe(201)
    })

    it('hanya post yang terlihat oleh pembagi: 404 sama dengan post tidak ada, tidak ada baris dibuat', async () => {
      const { alice, bob, post } = await world('FRIENDS')
      const hidden = await share(bob, post.id)
      const missing = await share(bob, 999999)
      expect(hidden.status).toBe(404)
      expect(hidden.body).toEqual(missing.body)
      expect(await h.prisma.post.count()).toBe(1)
      await h.befriend(alice, bob)
      expect((await share(bob, post.id)).status).toBe(201)
    })

    it.each([
      ['ONLY_ME', { privacy: 'ONLY_ME' as const }],
      ['hidden', { hidden: true }],
      ['soft-deleted', { deletedAt: new Date() }],
    ])('post asal %s tidak bisa dibagikan', async (_n, patch) => {
      const { bob, post } = await world('PUBLIC')
      await h.prisma.post.update({ where: { id: post.id }, data: patch })
      expect((await share(bob, post.id)).status).toBe(404)
    })

    it('validasi: privasi di luar enum, teks > 5.000, field asing (imageUrl, sharedFromId, authorId) ditolak', async () => {
      const { bob, post } = await world()
      expect((await share(bob, post.id, { privacy: 'SECRET' })).status).toBe(400)
      expect((await share(bob, post.id, { content: 'a'.repeat(5001) })).status).toBe(400)
      expect((await share(bob, post.id, { content: 'a'.repeat(5000) })).status).toBe(201)
      for (const body of [{ imageUrl: '/uploads/x.png' }, { sharedFromId: 1 }, { authorId: 1 }]) {
        expect((await share(bob, post.id, body)).status).toBe(400)
      }
    })

    it('tanpa login: 401; id bukan angka: 400', async () => {
      const { bob, post } = await world()
      expect(
        (await request(app.getHttpServer()).post(`/api/posts/${post.id}/share`).send({})).status,
      ).toBe(401)
      expect((await share(bob, 'abc' as unknown as number)).status).toBe(400)
    })

    it('share dari share merujuk post asal pertama (tanpa rantai)', async () => {
      const { alice, bob, carol, post } = await world()
      const first = (await share(bob, post.id, { privacy: 'PUBLIC' })).body
      const second = (await share(carol, first.id, { content: 'ikut' })).body
      expect(second.sharedFrom).toMatchObject({ id: post.id, author: { id: alice.id } })
      expect(
        (await h.prisma.post.findUniqueOrThrow({ where: { id: second.id } })).sharedFromId,
      ).toBe(post.id)
    })

    it('share dari share yang asalnya sudah tidak terlihat oleh pembagi: 422', async () => {
      const { bob, carol, post } = await world()
      const first = (await share(bob, post.id, { privacy: 'PUBLIC' })).body
      await h.prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } })
      const res = await share(carol, first.id)
      expect(res.status).toBe(422)
      expect(await h.prisma.post.count({ where: { authorId: carol.id } })).toBe(0)
    })
  })

  describe('membaca share: post asal mengikuti visibilitas PEMBACA', () => {
    const readFeed = async (viewer: Parameters<typeof h.as>[0]) =>
      (await h.as(viewer).get('/feed')).body.items
    const mkShare = async (bob: Parameters<typeof h.as>[0] & { id: number }, postId: number) =>
      (await share(bob, postId, { privacy: 'PUBLIC', content: 'komentar bob' })).body as {
        id: number
      }

    it('asal masih terlihat: disematkan lengkap di detail, feed, dan timeline', async () => {
      const { bob, carol, post } = await world('PUBLIC')
      await h.befriend(bob, carol)
      const s = await mkShare(bob, post.id)
      const detail = (await h.as(carol).get(`/posts/${s.id}`)).body
      expect(detail.sharedFrom).toMatchObject({ id: post.id, content: 'isi asli rahasia' })
      expect((await readFeed(carol))[0].sharedFrom.content).toBe('isi asli rahasia')
      expect(
        (await h.as(carol).get(`/users/${bob.username}/posts`)).body.items[0].sharedFrom.id,
      ).toBe(post.id)
    })

    it('asal dihapus: share tetap ada, sharedFrom { unavailable: true }, isi asli tidak bocor', async () => {
      const { bob, carol, post } = await world('PUBLIC')
      await h.befriend(bob, carol)
      const s = await mkShare(bob, post.id)
      await h.prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } })
      const detail = (await h.as(carol).get(`/posts/${s.id}`)).body
      expect(detail.sharedFrom).toEqual({ unavailable: true })
      expect(detail.content).toBe('komentar bob')
      expect(JSON.stringify(detail)).not.toContain('rahasia')
    })

    it('asal FRIENDS dibagikan ke publik: pembaca yang bukan teman penulis asli melihat "tidak tersedia", teman penulis melihat isinya', async () => {
      const { alice, bob, carol, post } = await world('FRIENDS')
      const dave = await h.mkUser('dave')
      await h.befriend(alice, bob) // bob boleh melihat dan membagikan
      await h.befriend(bob, carol)
      await h.befriend(alice, dave)
      await h.befriend(bob, dave)
      const s = await mkShare(bob, post.id)
      const asCarol = (await h.as(carol).get(`/posts/${s.id}`)).body
      expect(asCarol.sharedFrom).toEqual({ unavailable: true })
      expect(JSON.stringify(asCarol)).not.toContain('rahasia')
      expect((await h.as(dave).get(`/posts/${s.id}`)).body.sharedFrom.content).toBe(
        'isi asli rahasia',
      )
      expect((await h.as(alice).get(`/posts/${s.id}`)).body.sharedFrom.content).toBe(
        'isi asli rahasia',
      )
    })

    it('asal diubah ke ONLY_ME, di-hidden, atau penulis asli di-BANNED setelah dibagikan: pembaca lain melihat "tidak tersedia"', async () => {
      const { alice, bob, carol, post } = await world('PUBLIC')
      await h.befriend(bob, carol)
      const s = await mkShare(bob, post.id)
      const sharedFrom = async () => (await h.as(carol).get(`/posts/${s.id}`)).body.sharedFrom
      expect(await sharedFrom()).toMatchObject({ id: post.id })
      await h.prisma.post.update({ where: { id: post.id }, data: { privacy: 'ONLY_ME' } })
      expect(await sharedFrom()).toEqual({ unavailable: true })
      await h.prisma.post.update({
        where: { id: post.id },
        data: { privacy: 'PUBLIC', hidden: true },
      })
      expect(await sharedFrom()).toEqual({ unavailable: true })
      await h.prisma.post.update({ where: { id: post.id }, data: { hidden: false } })
      expect(await sharedFrom()).toMatchObject({ id: post.id })
      await h.prisma.user.update({ where: { id: alice.id }, data: { status: 'BANNED' } })
      expect(await sharedFrom()).toEqual({ unavailable: true })
    })

    it('like dan komentar pada share menghitung share itu sendiri, bukan post asal', async () => {
      const { alice, bob, carol, post } = await world('PUBLIC')
      await h.befriend(bob, carol)
      const s = await mkShare(bob, post.id)
      await h.as(carol).put(`/posts/${s.id}/like`)
      await h.as(carol).post(`/posts/${s.id}/comments`).send({ content: 'halo' })
      expect((await h.as(carol).get(`/posts/${s.id}`)).body).toMatchObject({
        likeCount: 1,
        commentCount: 1,
      })
      expect((await h.as(alice).get(`/posts/${post.id}`)).body).toMatchObject({
        likeCount: 0,
        commentCount: 0,
      })
    })

    it('post biasa tetap memiliki sharedFrom null', async () => {
      const { alice, post } = await world('PUBLIC')
      expect((await h.as(alice).get(`/posts/${post.id}`)).body.sharedFrom).toBeNull()
    })
  })

  describe('edit dan hapus share', () => {
    it('pembagi boleh mengubah komentar dan privasi share; boleh dikosongkan (isinya post asal)', async () => {
      const { bob, post } = await world()
      const s = (await share(bob, post.id, { content: 'awal' })).body
      const res = await h.as(bob).patch(`/posts/${s.id}`).send({ content: '', privacy: 'PUBLIC' })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        content: '',
        privacy: 'PUBLIC',
        sharedFrom: { id: post.id },
      })
    })

    it('share tidak bisa diberi foto', async () => {
      const { bob, post } = await world()
      const s = (await share(bob, post.id)).body
      const res = await h
        .as(bob)
        .patch(`/posts/${s.id}`)
        .send({ imageUrl: `/uploads/${'a'.repeat(32)}.png` })
      expect(res.status).toBe(400)
    })

    it('menghapus share tidak menyentuh post asal; post biasa tetap tidak boleh kosong', async () => {
      const { alice, bob, post } = await world()
      const s = (await share(bob, post.id)).body
      expect((await h.as(bob).del(`/posts/${s.id}`)).status).toBe(204)
      expect((await h.as(alice).get(`/posts/${post.id}`)).status).toBe(200)
      expect((await h.as(alice).patch(`/posts/${post.id}`).send({ content: '' })).status).toBe(400)
    })

    it('hanya pembagi yang boleh mengubah atau menghapus share', async () => {
      const { alice, bob, post } = await world()
      const s = (await share(bob, post.id, { privacy: 'PUBLIC' })).body
      expect((await h.as(alice).patch(`/posts/${s.id}`).send({ content: 'x' })).status).toBe(403)
      expect((await h.as(alice).del(`/posts/${s.id}`)).status).toBe(403)
    })
  })
})
