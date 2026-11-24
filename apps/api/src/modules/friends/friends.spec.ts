// Tes integrasi ke MySQL uji (FRD-01 sampai FRD-04, BR-01).
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

describe('Pertemanan (integrasi)', () => {
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

  const rows = () => h.prisma.friendship.findMany()

  describe('kirim permintaan (FRD-01)', () => {
    it.each([
      ['id kecil mengirim ke id besar', true],
      ['id besar mengirim ke id kecil', false],
    ])('%s: satu baris dengan pair (min, max)', async (_n, lowSends) => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const [from, to] = lowSends ? [a, b] : [b, a]
      const res = await h.as(from).post('/friends/requests').send({ userId: to.id })
      expect(res.status).toBe(201)
      expect(res.body).toEqual({ userId: to.id, status: 'PENDING' })
      const all = await rows()
      expect(all).toHaveLength(1)
      expect(all[0]).toMatchObject({
        requesterId: from.id,
        addresseeId: to.id,
        pairLowId: Math.min(a.id, b.id),
        pairHighId: Math.max(a.id, b.id),
        status: 'PENDING',
        respondedAt: null,
      })
    })

    it('ke diri sendiri: 422 SELF_ACTION_NOT_ALLOWED', async () => {
      const a = await h.mkUser('a')
      const res = await h.as(a).post('/friends/requests').send({ userId: a.id })
      expect(res.status).toBe(422)
      expect(res.body.code).toBe('SELF_ACTION_NOT_ALLOWED')
      expect(await rows()).toHaveLength(0)
    })

    it('user tidak ada, BANNED, atau terhapus: 404 yang sama', async () => {
      const a = await h.mkUser('a')
      const banned = await h.mkUser('banned', { status: 'BANNED' })
      const gone = await h.mkUser('gone', { deletedAt: new Date() })
      const bodies = []
      for (const id of [999999, banned.id, gone.id]) {
        const res = await h.as(a).post('/friends/requests').send({ userId: id })
        expect(res.status).toBe(404)
        bodies.push(res.body)
      }
      expect(bodies[1]).toEqual(bodies[0])
      expect(bodies[2]).toEqual(bodies[0])
      expect(await rows()).toHaveLength(0)
    })

    it('kirim ulang permintaan yang masih PENDING: 409 REQUEST_PENDING, tetap satu baris', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      const res = await h.as(a).post('/friends/requests').send({ userId: b.id })
      expect(res.status).toBe(409)
      expect(res.body.code).toBe('REQUEST_PENDING')
      expect(await rows()).toHaveLength(1)
    })

    it('sudah berteman: 409 ALREADY_FRIENDS dari kedua arah', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.befriend(a, b)
      for (const [from, to] of [
        [a, b],
        [b, a],
      ] as const) {
        const res = await h.as(from).post('/friends/requests').send({ userId: to.id })
        expect(res.status).toBe(409)
        expect(res.body.code).toBe('ALREADY_FRIENDS')
      }
      expect(await rows()).toHaveLength(1)
    })

    it('permintaan silang: langsung ACCEPTED, tetap satu baris, respondedAt terisi', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      const res = await h.as(b).post('/friends/requests').send({ userId: a.id })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('ACCEPTED')
      const all = await rows()
      expect(all).toHaveLength(1)
      expect(all[0]).toMatchObject({ status: 'ACCEPTED', requesterId: a.id })
      expect(all[0]!.respondedAt).not.toBeNull()
    })

    it('permintaan silang serentak: tetap satu baris dan berakhir ACCEPTED', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const [r1, r2] = await Promise.all([
        h.as(a).post('/friends/requests').send({ userId: b.id }),
        h.as(b).post('/friends/requests').send({ userId: a.id }),
      ])
      expect([r1.status, r2.status].every((s) => s === 201)).toBe(true)
      const all = await rows()
      expect(all).toHaveLength(1)
      expect(all[0]!.status).toBe('ACCEPTED')
    })

    it('pengiriman serentak dari pengirim yang sama: satu baris, sisanya 409 tanpa 500', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const results = await Promise.all(
        Array.from({ length: 5 }, () => h.as(a).post('/friends/requests').send({ userId: b.id })),
      )
      expect(results.filter((r) => r.status === 201)).toHaveLength(1)
      expect(results.filter((r) => r.status === 409)).toHaveLength(4)
      expect(await rows()).toHaveLength(1)
    })

    it('validasi: userId bukan angka atau tidak ada: 400; field asing: 400; tanpa login: 401', async () => {
      const a = await h.mkUser('a')
      expect((await h.as(a).post('/friends/requests').send({ userId: 'abc' })).status).toBe(400)
      expect((await h.as(a).post('/friends/requests').send({})).status).toBe(400)
      expect((await h.as(a).post('/friends/requests').send({ userId: 0 })).status).toBe(400)
      expect(
        (await h.as(a).post('/friends/requests').send({ userId: 2, status: 'ACCEPTED' })).status,
      ).toBe(400)
      expect(
        (await request(app.getHttpServer()).post('/api/friends/requests').send({ userId: 2 }))
          .status,
      ).toBe(401)
    })
  })

  describe('terima (FRD-02)', () => {
    it('penerima menerima: satu baris menjadi ACCEPTED, kedua pihak saling melihat sebagai teman', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      const res = await h.as(b).post(`/friends/requests/${a.id}/accept`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ userId: a.id, status: 'ACCEPTED' })
      expect(await rows()).toHaveLength(1)
      expect((await h.as(a).get('/friends')).body.items.map((u: { id: number }) => u.id)).toEqual([
        b.id,
      ])
      expect((await h.as(b).get('/friends')).body.items.map((u: { id: number }) => u.id)).toEqual([
        a.id,
      ])
    })

    it('hanya penerima: pengirim menerima permintaannya sendiri 404 dan status tidak berubah', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      expect((await h.as(a).post(`/friends/requests/${b.id}/accept`)).status).toBe(404)
      expect((await rows())[0]!.status).toBe('PENDING')
    })

    it('orang ketiga tidak bisa menerima; tanpa permintaan: 404; diulang aman (idempoten)', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const c = await h.mkUser('c')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      expect((await h.as(c).post(`/friends/requests/${a.id}/accept`)).status).toBe(404)
      expect((await h.as(b).post(`/friends/requests/${c.id}/accept`)).status).toBe(404)
      expect((await h.as(b).post(`/friends/requests/${a.id}/accept`)).status).toBe(200)
      expect((await h.as(b).post(`/friends/requests/${a.id}/accept`)).status).toBe(200)
      expect(await rows()).toHaveLength(1)
    })

    it('setelah diterima, post FRIENDS terlihat dan masuk feed', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const post = await h.prisma.post.create({
        data: { authorId: a.id, content: 'untuk teman', privacy: 'FRIENDS' },
      })
      expect((await h.as(b).get(`/posts/${post.id}`)).status).toBe(404)
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      await h.as(b).post(`/friends/requests/${a.id}/accept`)
      expect((await h.as(b).get(`/posts/${post.id}`)).status).toBe(200)
      expect((await h.as(b).get('/feed')).body.items.map((p: { id: number }) => p.id)).toEqual([
        post.id,
      ])
    })
  })

  describe('tolak, batalkan, unfriend (FRD-02, FRD-03)', () => {
    it('penerima menolak: baris dihapus; bisa mengirim lagi setelahnya', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      expect((await h.as(b).del(`/friends/requests/${a.id}`)).status).toBe(204)
      expect(await rows()).toHaveLength(0)
      expect((await h.as(a).post('/friends/requests').send({ userId: b.id })).status).toBe(201)
    })

    it('pengirim membatalkan: baris dihapus', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      expect((await h.as(a).del(`/friends/requests/${b.id}`)).status).toBe(204)
      expect(await rows()).toHaveLength(0)
      expect((await h.as(a).del(`/friends/requests/${b.id}`)).status).toBe(404)
    })

    it('tolak/batalkan tidak bisa menghapus pertemanan yang sudah ACCEPTED; orang ketiga 404', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const c = await h.mkUser('c')
      await h.befriend(a, b)
      expect((await h.as(b).del(`/friends/requests/${a.id}`)).status).toBe(404)
      await h.prisma.friendship.deleteMany()
      await h.befriend(a, b, 'PENDING')
      expect((await h.as(c).del(`/friends/requests/${a.id}`)).status).toBe(404)
      expect(await rows()).toHaveLength(1)
    })

    it('unfriend dari kedua arah menghapus baris tunggal; post FRIENDS langsung hilang', async () => {
      for (const unfriender of ['a', 'b'] as const) {
        await resetDb(h.prisma)
        const a = await h.mkUser('a')
        const b = await h.mkUser('b')
        await h.befriend(a, b)
        const post = await h.prisma.post.create({
          data: { authorId: a.id, content: 'x', privacy: 'FRIENDS' },
        })
        expect((await h.as(b).get(`/posts/${post.id}`)).status).toBe(200)
        const [who, other] = unfriender === 'a' ? [a, b] : [b, a]
        expect((await h.as(who).del(`/friends/${other.id}`)).status).toBe(204)
        expect(await rows()).toHaveLength(0)
        expect((await h.as(b).get(`/posts/${post.id}`)).status).toBe(404)
      }
    })

    it('unfriend orang yang bukan teman (atau baru PENDING): 404 dan baris tidak berubah', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const c = await h.mkUser('c')
      await h.befriend(a, b, 'PENDING')
      expect((await h.as(a).del(`/friends/${b.id}`)).status).toBe(404)
      expect((await h.as(a).del(`/friends/${c.id}`)).status).toBe(404)
      expect(await rows()).toHaveLength(1)
    })

    it('tanpa login: 401; id bukan angka: 400', async () => {
      const a = await h.mkUser('a')
      expect((await request(app.getHttpServer()).delete('/api/friends/1')).status).toBe(401)
      expect((await h.as(a).del('/friends/abc')).status).toBe(400)
      expect((await h.as(a).post('/friends/requests/abc/accept')).status).toBe(400)
    })
  })

  describe('daftar permintaan masuk dan daftar teman (FRD-04)', () => {
    it('permintaan masuk: hanya yang PENDING dan ditujukan ke saya; terbaru dulu; kursor', async () => {
      const me = await h.mkUser('me')
      const senders = []
      for (let i = 0; i < 4; i++) {
        const s = await h.mkUser(`s${i}`)
        senders.push(s)
        await h.as(s).post('/friends/requests').send({ userId: me.id })
      }
      const other = await h.mkUser('other')
      await h.as(me).post('/friends/requests').send({ userId: other.id }) // keluar: tidak ikut
      const banned = await h.mkUser('banned', { status: 'BANNED' })
      await h.befriend(banned, me, 'PENDING') // pengirim BANNED: disembunyikan

      const p1 = (await h.as(me).get('/friends/requests?limit=3')).body
      expect(p1.items.map((r: { user: { id: number } }) => r.user.id)).toEqual([
        senders[3]!.id,
        senders[2]!.id,
        senders[1]!.id,
      ])
      expect(p1.items[0].createdAt).toEqual(expect.any(String))
      expect(p1.items[0].user.email).toBeUndefined()
      const p2 = (await h.as(me).get(`/friends/requests?limit=3&cursor=${p1.nextCursor}`)).body
      expect(p2.items.map((r: { user: { id: number } }) => r.user.id)).toEqual([senders[0]!.id])
      expect(p2.nextCursor).toBeNull()
    })

    it('daftar teman: kedua arah, total, kursor, tanpa PENDING, BANNED, dan terhapus', async () => {
      const me = await h.mkUser('me')
      const friends = []
      for (let i = 0; i < 5; i++) {
        const f = await h.mkUser(`f${i}`)
        friends.push(f)
        // selang-seling arah permintaan
        await (i % 2 === 0 ? h.befriend(me, f) : h.befriend(f, me))
      }
      await h.befriend(me, await h.mkUser('pending'), 'PENDING')
      await h.befriend(me, await h.mkUser('banned', { status: 'BANNED' }))
      await h.befriend(me, await h.mkUser('gone', { deletedAt: new Date() }))

      const p1 = (await h.as(me).get('/friends?limit=2')).body
      expect(p1.total).toBe(5)
      expect(p1.items.map((u: { id: number }) => u.id)).toEqual([friends[4]!.id, friends[3]!.id])
      const p2 = (await h.as(me).get(`/friends?limit=2&cursor=${p1.nextCursor}`)).body
      expect(p2.items.map((u: { id: number }) => u.id)).toEqual([friends[2]!.id, friends[1]!.id])
      const p3 = (await h.as(me).get(`/friends?limit=2&cursor=${p2.nextCursor}`)).body
      expect(p3.items.map((u: { id: number }) => u.id)).toEqual([friends[0]!.id])
      expect(p3.nextCursor).toBeNull()
      expect(p1.items[0].passwordHash).toBeUndefined()
    })

    it('?q= memfilter nama atau username (tanpa memperhatikan huruf besar); karakter wildcard tidak dianggap pola', async () => {
      const me = await h.mkUser('me')
      const budi = await h.mkUser('x', { displayName: 'Budi Santoso', username: 'budi_s' })
      const siti = await h.mkUser('y', { displayName: 'Siti Aminah', username: 'siti_a' })
      await h.befriend(me, budi)
      await h.befriend(me, siti)
      const sitiX = await h.mkUser('z', { displayName: 'Sitixa Lain', username: 'sitixa' })
      await h.befriend(me, sitiX)
      const names = async (q: string) =>
        (await h.as(me).get(`/friends?q=${encodeURIComponent(q)}`)).body.items.map(
          (u: { id: number }) => u.id,
        )
      expect(await names('BUDI')).toEqual([budi.id])
      expect(await names('siti_a')).toEqual([siti.id]) // '_' dicocokkan apa adanya, bukan satu karakter bebas
      expect(await names('aminah')).toEqual([siti.id])
      expect(await names('%')).toEqual([])
      expect(await names('zzz')).toEqual([])
      expect((await h.as(me).get('/friends?q=budi')).body.total).toBe(1)
    })

    it('daftar teman orang lain tidak bisa dibaca lewat endpoint ini (hanya milik sendiri)', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const c = await h.mkUser('c')
      await h.befriend(a, b)
      const asC = (await h.as(c).get('/friends')).body
      expect(asC).toMatchObject({ items: [], total: 0 })
    })

    it('tanpa login: 401', async () => {
      expect((await request(app.getHttpServer()).get('/api/friends')).status).toBe(401)
      expect((await request(app.getHttpServer()).get('/api/friends/requests')).status).toBe(401)
    })
  })
})
