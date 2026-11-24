// Tes integrasi poke (T-34, POK-01, BR-11).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { User } from '@prisma/client'
import { io, Socket } from 'socket.io-client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Poke (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  let url: string
  const open: Socket[] = []

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.listen(0)
    url = `${await app.getUrl()}/realtime`.replace('[::1]', '127.0.0.1')
    h = testHelpers(app)
  })
  beforeEach(() => resetDb(h.prisma))
  afterEach(() => {
    open.splice(0).forEach((s) => s.close())
  })
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  const pair = async () => {
    const a = await h.mkUser('a')
    const b = await h.mkUser('b')
    await h.befriend(a, b)
    return { a, b }
  }
  const poke = (from: User, to: User | number) =>
    h
      .as(from)
      .post('/pokes')
      .send({ userId: typeof to === 'number' ? to : to.id })
  const list = async (u: User, qs = '') => (await h.as(u).get(`/pokes${qs}`)).body
  const rows = () => h.prisma.poke.findMany()

  it('tanpa token: 401', async () => {
    expect((await request(app.getHttpServer()).post('/api/pokes').send({ userId: 1 })).status).toBe(
      401,
    )
  })

  describe('POST /pokes', () => {
    it('teman: 200, satu baris, notifikasi POKE ke penerima', async () => {
      const { a, b } = await pair()
      const res = await poke(a, b)
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ userId: b.id })
      expect(await rows()).toHaveLength(1)
      const n = (await h.as(b).get('/notifications')).body.items
      expect(n).toHaveLength(1)
      expect(n[0]).toMatchObject({ type: 'POKE', text: 'a poked you', actor: { id: a.id } })
      expect((await h.as(a).get('/notifications')).body.items).toHaveLength(0)
    })

    it('diri sendiri: 422', async () => {
      const a = await h.mkUser('a')
      const res = await poke(a, a)
      expect(res.status).toBe(422)
      expect(res.body.code).toBe('SELF_ACTION_NOT_ALLOWED')
    })

    it.each([
      [
        'bukan teman',
        async (a: User, b: User) =>
          void (await h.prisma.friendship.deleteMany({
            where: { OR: [{ requesterId: a.id }, { requesterId: b.id }] },
          })),
      ],
      [
        'permintaan PENDING',
        async (a: User, b: User) => {
          await h.prisma.friendship.deleteMany()
          await h.befriend(a, b, 'PENDING')
        },
      ],
      [
        'diblokir (pemblokir poke)',
        async (a: User, b: User) =>
          void (await h.prisma.block.create({ data: { blockerId: a.id, blockedId: b.id } })),
      ],
      [
        'diblokir (yang diblokir poke)',
        async (a: User, b: User) =>
          void (await h.prisma.block.create({ data: { blockerId: b.id, blockedId: a.id } })),
      ],
      [
        'target BANNED',
        async (_a: User, b: User) =>
          void (await h.prisma.user.update({ where: { id: b.id }, data: { status: 'BANNED' } })),
      ],
      [
        'target terhapus',
        async (_a: User, b: User) =>
          void (await h.prisma.user.update({
            where: { id: b.id },
            data: { deletedAt: new Date() },
          })),
      ],
    ])('%s: 404 yang sama, tanpa baris dan notifikasi', async (_n, setup) => {
      const { a, b } = await pair()
      await setup(a, b)
      const res = await poke(a, b)
      expect(res.status).toBe(404)
      expect(res.body.code).toBe('NOT_FOUND')
      expect(await rows()).toHaveLength(0)
      expect(await h.prisma.notification.count()).toBe(0)
    })

    it('user tidak ada: 404 yang sama', async () => {
      const a = await h.mkUser('a')
      const res = await poke(a, 999999)
      expect(res.status).toBe(404)
    })

    it.each([[{}], [{ userId: 'x' }], [{ userId: 0 }], [{ userId: 1, extra: 1 }]])(
      'body %j ditolak 400',
      async (body) => {
        const a = await h.mkUser('a')
        expect((await h.as(a).post('/pokes').send(body)).status).toBe(400)
      },
    )

    it('poke ulang memperbarui baris yang sama dan mengosongkan seen_at', async () => {
      const { a, b } = await pair()
      await poke(a, b)
      await h.as(b).del(`/pokes/${a.id}`)
      const first = (await rows())[0]!
      expect(first.seenAt).not.toBeNull()

      await new Promise((r) => setTimeout(r, 1100)) // createdAt memiliki presisi detik
      await poke(a, b)
      const all = await rows()
      expect(all).toHaveLength(1)
      expect(all[0]!.id).toBe(first.id)
      expect(all[0]!.seenAt).toBeNull()
      expect(all[0]!.createdAt.getTime()).toBeGreaterThan(first.createdAt.getTime())
      expect((await list(b)).items).toHaveLength(1)
    })

    it('poke balik menuntaskan poke dari lawan; dua baris, satu per arah', async () => {
      const { a, b } = await pair()
      await poke(a, b)
      expect((await list(b)).items).toHaveLength(1)
      await poke(b, a)
      expect(await rows()).toHaveLength(2)
      expect((await list(b)).items).toHaveLength(0) // sudah dibalas
      expect((await list(a)).items).toHaveLength(1)
    })

    it('poke serentak dari pasangan yang sama tidak membuat baris ganda', async () => {
      const { a, b } = await pair()
      const rs = await Promise.all([poke(a, b), poke(a, b), poke(a, b)])
      expect(rs.every((r) => r.status === 200)).toBe(true)
      expect(await rows()).toHaveLength(1)
    })

    it('realtime: penerima mendapat poke:new dan notification:new', async () => {
      const { a, b } = await pair()
      const s = io(url, {
        auth: { token: h.tokenOf(b) },
        transports: ['websocket'],
        reconnection: false,
      })
      open.push(s)
      await new Promise<void>((res, rej) => {
        s.on('connect', () => res())
        s.on('connect_error', rej)
      })
      const gotPoke = new Promise<{ from: { id: number } }>((res) => s.once('poke:new', res))
      const gotNotif = new Promise<{ type: string }>((res) => s.once('notification:new', res))
      await poke(a, b)
      expect((await gotPoke).from.id).toBe(a.id)
      expect((await gotNotif).type).toBe('POKE')
    })
  })

  describe('GET /pokes', () => {
    it('hanya poke diterima yang aktif, terbaru dulu, dengan cursor', async () => {
      const me = await h.mkUser('me')
      const others: User[] = []
      for (const n of ['p', 'q', 'r']) {
        const u = await h.mkUser(n)
        await h.befriend(me, u)
        others.push(u)
        await poke(u, me)
        await new Promise((r) => setTimeout(r, 1100))
      }
      await poke(me, others[0]!) // poke keluar tidak muncul di daftar saya (dan membalas p)

      const p1 = await list(me, '?limit=1')
      expect(p1.items.map((i: { user: User }) => i.user.id)).toEqual([others[2]!.id])
      const p2 = await list(me, `?limit=5&cursor=${p1.nextCursor}`)
      expect(p2.items.map((i: { user: User }) => i.user.id)).toEqual([others[1]!.id]) // p dibalas
      expect(p2.nextCursor).toBeNull()
      expect(p1.items[0]).toEqual({
        user: expect.objectContaining({ id: others[2]!.id, displayName: 'r' }),
        createdAt: expect.any(String),
      })
    }, 15000)

    it.each([
      [
        'pengirim di-unfriend',
        (a: User, b: User) =>
          h.prisma.friendship.deleteMany({
            where: { OR: [{ requesterId: a.id }, { requesterId: b.id }] },
          }),
      ],
      [
        'pengirim diblokir',
        (a: User, b: User) => h.prisma.block.create({ data: { blockerId: b.id, blockedId: a.id } }),
      ],
      [
        'pengirim BANNED',
        (a: User) => h.prisma.user.update({ where: { id: a.id }, data: { status: 'BANNED' } }),
      ],
      [
        'pengirim terhapus',
        (a: User) => h.prisma.user.update({ where: { id: a.id }, data: { deletedAt: new Date() } }),
      ],
    ])('%s: poke hilang dari daftar', async (_n, change) => {
      const { a, b } = await pair()
      await poke(a, b)
      expect((await list(b)).items).toHaveLength(1)
      await change(a, b)
      expect((await list(b)).items).toHaveLength(0)
    })
  })

  describe('DELETE /pokes/:userId', () => {
    it('menandai dilihat: 204 dan hilang dari daftar; diulang 404', async () => {
      const { a, b } = await pair()
      await poke(a, b)
      expect((await h.as(b).del(`/pokes/${a.id}`)).status).toBe(204)
      expect((await list(b)).items).toHaveLength(0)
      expect((await h.as(b).del(`/pokes/${a.id}`)).status).toBe(404)
    })

    it('hanya poke yang diterima sendiri: pengirim tidak bisa menghapus poke-nya sendiri', async () => {
      const { a, b } = await pair()
      await poke(a, b)
      expect((await h.as(a).del(`/pokes/${b.id}`)).status).toBe(404)
      expect((await list(b)).items).toHaveLength(1)
    })
  })
})
