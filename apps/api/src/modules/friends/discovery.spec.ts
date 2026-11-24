// Tes integrasi People You May Know dan birthday (T-41, FRD-05, FRD-07, BR-05, BR-11).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { User } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Penemuan teman (integrasi)', () => {
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

  const suggestions = async (u: User, qs = '') =>
    (await h.as(u).get(`/friends/suggestions${qs}`)).body.items as {
      user: { id: number; displayName: string }
      mutualFriends: number
    }[]
  const ids = (items: { user: { id: number } }[]) => items.map((i) => i.user.id)

  it('tanpa token: 401', async () => {
    expect((await request(app.getHttpServer()).get('/api/friends/suggestions')).status).toBe(401)
    expect((await request(app.getHttpServer()).get('/api/friends/birthdays')).status).toBe(401)
  })

  describe('GET /friends/suggestions (FRD-05)', () => {
    /** me berteman dengan f1 dan f2. x berteman dengan keduanya, y dengan f1 saja, z dengan f2 saja. */
    const world = async () => {
      // Berurutan: urutan id menentukan hasil seri (y sebelum z).
      const made: User[] = []
      for (const n of ['me', 'f1', 'f2', 'x', 'y', 'z']) made.push(await h.mkUser(n))
      const [me, f1, f2, x, y, z] = made
      await h.befriend(me!, f1!)
      await h.befriend(me!, f2!)
      await h.befriend(x!, f1!)
      await h.befriend(x!, f2!)
      await h.befriend(y!, f1!)
      await h.befriend(z!, f2!)
      return { me: me!, f1: f1!, f2: f2!, x: x!, y: y!, z: z! }
    }

    it('teman dari teman, urut jumlah teman bersama (turun) lalu id; tanpa diri sendiri dan teman', async () => {
      const w = await world()
      const items = await suggestions(w.me)
      expect(items.map((i) => [i.user.displayName, i.mutualFriends])).toEqual([
        ['x', 2],
        ['y', 1],
        ['z', 1],
      ])
      expect(Object.keys(items[0]!.user).sort()).toEqual([
        'avatarUrl',
        'displayName',
        'id',
        'isBot',
        'username',
      ])
      expect(ids(items)).not.toContain(w.me.id)
      expect(ids(items)).not.toContain(w.f1.id)
    })

    it('limit bawaan 5, bisa diubah, di atas 20 atau nol: 400', async () => {
      const me = await h.mkUser('me')
      const f = await h.mkUser('f')
      await h.befriend(me, f)
      for (let i = 0; i < 7; i++) await h.befriend(await h.mkUser(`c${i}`), f)
      expect(await suggestions(me)).toHaveLength(5)
      expect(await suggestions(me, '?limit=2')).toHaveLength(2)
      expect(await suggestions(me, '?limit=20')).toHaveLength(7)
      expect((await h.as(me).get('/friends/suggestions?limit=21')).status).toBe(400)
      expect((await h.as(me).get('/friends/suggestions?limit=0')).status).toBe(400)
    })

    it('tanpa teman atau tanpa teman dari teman: kosong', async () => {
      const lonely = await h.mkUser('lonely')
      expect(await suggestions(lonely)).toEqual([])
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.befriend(a, b)
      expect(await suggestions(a)).toEqual([])
    })

    it.each([
      [
        'permintaan terkirim (PENDING, saya pengirim)',
        async (w: Awaited<ReturnType<typeof world>>) =>
          void (await h.befriend(w.me, w.y, 'PENDING')),
      ],
      [
        'permintaan masuk (PENDING, saya penerima)',
        async (w: Awaited<ReturnType<typeof world>>) =>
          void (await h.befriend(w.y, w.me, 'PENDING')),
      ],
      [
        'sudah berteman',
        async (w: Awaited<ReturnType<typeof world>>) => void (await h.befriend(w.me, w.y)),
      ],
      [
        'saya memblokir',
        async (w: Awaited<ReturnType<typeof world>>) =>
          void (await h.prisma.block.create({ data: { blockerId: w.me.id, blockedId: w.y.id } })),
      ],
      [
        'dia memblokir saya',
        async (w: Awaited<ReturnType<typeof world>>) =>
          void (await h.prisma.block.create({ data: { blockerId: w.y.id, blockedId: w.me.id } })),
      ],
      [
        'BANNED',
        async (w: Awaited<ReturnType<typeof world>>) =>
          void (await h.prisma.user.update({ where: { id: w.y.id }, data: { status: 'BANNED' } })),
      ],
      [
        'terhapus',
        async (w: Awaited<ReturnType<typeof world>>) =>
          void (await h.prisma.user.update({
            where: { id: w.y.id },
            data: { deletedAt: new Date() },
          })),
      ],
      [
        'bot',
        async (w: Awaited<ReturnType<typeof world>>) =>
          void (await h.prisma.user.update({ where: { id: w.y.id }, data: { isBot: true } })),
      ],
    ])('y tidak muncul bila %s', async (_n, change) => {
      const w = await world()
      expect(ids(await suggestions(w.me))).toContain(w.y.id)
      await change(w)
      expect(ids(await suggestions(w.me))).not.toContain(w.y.id)
      expect(ids(await suggestions(w.me))).toContain(w.x.id) // yang lain tetap
    })

    it('teman bersama yang BANNED atau diblokir tidak dihitung', async () => {
      const w = await world()
      expect((await suggestions(w.me))[0]).toMatchObject({ user: { id: w.x.id }, mutualFriends: 2 })
      await h.prisma.user.update({ where: { id: w.f2.id }, data: { status: 'BANNED' } })
      const items = await suggestions(w.me)
      expect(items.find((i) => i.user.id === w.x.id)!.mutualFriends).toBe(1)
      expect(ids(items)).not.toContain(w.z.id) // z hanya terhubung lewat f2
    })

    it('mengirim permintaan menghapusnya dari saran; unfriend teman bersama menurunkan hitungan', async () => {
      const w = await world()
      expect((await h.as(w.me).post('/friends/requests').send({ userId: w.x.id })).status).toBe(201)
      expect(ids(await suggestions(w.me))).not.toContain(w.x.id)
      await h.prisma.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: w.f1.id, addresseeId: w.me.id },
            { requesterId: w.me.id, addresseeId: w.f1.id },
          ],
        },
      })
      expect(ids(await suggestions(w.me))).not.toContain(w.y.id) // y hanya lewat f1
    })

    it('tidak membocorkan saran milik orang lain: dihitung dari sudut pandang pemanggil', async () => {
      const w = await world()
      const other = await suggestions(w.y)
      expect(ids(other)).toContain(w.x.id) // lewat f1
      expect(ids(other)).toContain(w.me.id)
    })
  })

  describe('GET /friends/birthdays (FRD-07)', () => {
    const mkBirthday = (name: string, birthday: string, extra: Partial<User> = {}) =>
      h.prisma.user.create({
        data: {
          email: `${name}@example.com`,
          username: name,
          displayName: name,
          passwordHash: 'x',
          birthday: new Date(`${birthday}T00:00:00Z`),
          ...extra,
        },
      })
    const names = async (u: User, date?: string) =>
      (
        (await h.as(u).get(`/friends/birthdays${date ? `?date=${date}` : ''}`)).body.items as {
          displayName: string
        }[]
      ).map((i) => i.displayName)

    it('hanya teman dengan tanggal lahir yang cocok; urut nama; tahun lahir tidak dibocorkan', async () => {
      const me = await h.mkUser('me')
      const a = await mkBirthday('amy', '1990-08-30')
      const b = await mkBirthday('ben', '2001-08-30')
      const c = await mkBirthday('cal', '1990-08-31')
      const stranger = await mkBirthday('sam', '1990-08-30')
      void stranger
      for (const f of [b, a, c]) await h.befriend(me, f)
      expect(await names(me, '2026-08-30')).toEqual(['amy', 'ben'])
      expect(await names(me, '2026-08-31')).toEqual(['cal'])
      expect(await names(me, '2026-09-01')).toEqual([])
      const item = (await h.as(me).get('/friends/birthdays?date=2026-08-30')).body.items[0]
      expect(Object.keys(item).sort()).toEqual([
        'avatarUrl',
        'displayName',
        'id',
        'isBot',
        'username',
      ])
    })

    it('tanpa date: memakai hari ini (UTC)', async () => {
      const me = await h.mkUser('me')
      const today = new Date().toISOString().slice(0, 10)
      const f = await mkBirthday('today', `1990-${today.slice(5)}`)
      await h.befriend(me, f)
      expect(await names(me)).toEqual(['today'])
    })

    it('teman tanpa tanggal lahir diabaikan', async () => {
      const me = await h.mkUser('me')
      await h.befriend(me, await h.mkUser('none'))
      expect(await names(me, '2026-08-30')).toEqual([])
    })

    it('29 Februari: dirayakan 29 Feb di tahun kabisat; 1 Maret di tahun biasa', async () => {
      const me = await h.mkUser('me')
      await h.befriend(me, await mkBirthday('leapling', '2000-02-29'))
      expect(await names(me, '2028-02-29')).toEqual(['leapling'])
      expect(await names(me, '2028-03-01')).toEqual([])
      expect(await names(me, '2027-03-01')).toEqual(['leapling'])
      expect(await names(me, '2027-02-28')).toEqual([])
    })

    it.each([
      [
        'PENDING',
        async (me: User, f: User) => {
          await h.prisma.friendship.deleteMany()
          await h.befriend(me, f, 'PENDING')
        },
      ],
      [
        'BANNED',
        async (_me: User, f: User) =>
          void (await h.prisma.user.update({ where: { id: f.id }, data: { status: 'BANNED' } })),
      ],
      [
        'diblokir',
        async (me: User, f: User) =>
          void (await h.prisma.block.create({ data: { blockerId: me.id, blockedId: f.id } })),
      ],
    ])('teman %s tidak muncul', async (_n, change) => {
      const me = await h.mkUser('me')
      const f = await mkBirthday('f', '1990-08-30')
      await h.befriend(me, f)
      expect(await names(me, '2026-08-30')).toEqual(['f'])
      await change(me, f)
      expect(await names(me, '2026-08-30')).toEqual([])
    })

    it.each([
      ['2026-8-30'],
      ['30-08-2026'],
      ['abc'],
      ['2026-08-30T00:00'],
      ['2026-02-30'],
      ['2026-13-01'],
    ])('date %s: 400', async (d) => {
      const me = await h.mkUser('me')
      expect((await h.as(me).get(`/friends/birthdays?date=${encodeURIComponent(d)}`)).status).toBe(
        400,
      )
    })
  })
})
