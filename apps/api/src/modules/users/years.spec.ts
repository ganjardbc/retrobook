// Tes integrasi scroller tahun (T-44, PRF-05): GET /users/:username/years dan ?year= pada timeline.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { User } from '@prisma/client'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Scroller tahun (integrasi)', () => {
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

  const at = (iso: string) => new Date(iso)
  const mk = (owner: User, content: string, createdAt: string, extra: object = {}) =>
    h.prisma.post.create({
      data: { authorId: owner.id, content, privacy: 'PUBLIC', createdAt: at(createdAt), ...extra },
    })
  const years = async (viewer: User, owner: User) =>
    (await h.as(viewer).get(`/users/${owner.username}/years`)).body.items as number[]
  const contents = (r: { body: { items: { content: string }[] } }) =>
    r.body.items.map((p) => p.content)

  it('tanpa token: 401', async () => {
    const owner = await h.mkUser('owner')
    const request = (await import('supertest')).default
    const res = await request(app.getHttpServer()).get(`/api/users/${owner.username}/years`)
    expect(res.status).toBe(401)
  })

  it('daftar tahun yang punya post, terbaru dulu, tanpa tahun kosong; batas tahun UTC', async () => {
    const owner = await h.mkUser('owner')
    await mk(owner, 'a', '2014-06-01T00:00:00Z')
    await mk(owner, 'b', '2014-12-31T23:59:59Z')
    await mk(owner, 'c', '2016-01-01T00:00:00Z')
    await mk(owner, 'd', '2013-03-03T00:00:00Z')
    expect(await years(owner, owner)).toEqual([2016, 2014, 2013])
  })

  it('tanpa post: daftar kosong; profil tidak ada: 404', async () => {
    const owner = await h.mkUser('owner')
    expect(await years(owner, owner)).toEqual([])
    expect((await h.as(owner).get('/users/tidakada/years')).status).toBe(404)
  })

  it('hanya tahun dari post yang boleh dilihat penonton (privasi, hidden, terhapus)', async () => {
    const [owner, friend, stranger] = (await Promise.all(
      ['owner', 'friend', 'stranger'].map((n) => h.mkUser(n)),
    )) as [User, User, User]
    await h.befriend(owner, friend)
    await mk(owner, 'publik', '2015-01-01T00:00:00Z')
    await mk(owner, 'teman', '2014-01-01T00:00:00Z', { privacy: 'FRIENDS' })
    await mk(owner, 'pribadi', '2013-01-01T00:00:00Z', { privacy: 'ONLY_ME' })
    await mk(owner, 'hidden', '2012-01-01T00:00:00Z', { hidden: true })
    await mk(owner, 'dihapus', '2011-01-01T00:00:00Z', { deletedAt: new Date() })
    expect(await years(stranger, owner)).toEqual([2015])
    expect(await years(friend, owner)).toEqual([2015, 2014])
    // pemilik: semua kecuali terhapus (hidden milik sendiri tetap terlihat)
    expect(await years(owner, owner)).toEqual([2015, 2014, 2013, 2012])
  })

  it('post di dinding pemilik profil ikut dihitung; penulis BANNED atau pasangan blokir tidak', async () => {
    const [owner, friend, other] = (await Promise.all(
      ['owner', 'friend', 'other'].map((n) => h.mkUser(n)),
    )) as [User, User, User]
    await h.befriend(owner, friend)
    await h.prisma.post.create({
      data: {
        authorId: friend.id,
        wallOwnerId: owner.id,
        content: 'wall',
        privacy: 'FRIENDS',
        createdAt: at('2012-05-05T00:00:00Z'),
      },
    })
    expect(await years(owner, owner)).toEqual([2012])
    await h.prisma.block.create({ data: { blockerId: owner.id, blockedId: friend.id } })
    expect(await years(owner, owner)).toEqual([])
    expect(await years(other, owner)).toEqual([])
  })

  describe('?year= pada timeline', () => {
    it('hanya post tahun itu (batas UTC), pagination cursor, dan tetap lewat aturan visibilitas', async () => {
      const [owner, stranger] = (await Promise.all(
        ['owner', 'stranger'].map((n) => h.mkUser(n)),
      )) as [User, User]
      await mk(owner, 'akhir-2013', '2013-12-31T23:59:59Z')
      await mk(owner, 'awal-2014', '2014-01-01T00:00:00Z')
      await mk(owner, 'tengah-2014', '2014-07-01T00:00:00Z')
      await mk(owner, 'rahasia-2014', '2014-08-01T00:00:00Z', { privacy: 'ONLY_ME' })
      await mk(owner, 'awal-2015', '2015-01-01T00:00:00Z')
      const base = `/users/${owner.username}/posts`
      expect(contents(await h.as(stranger).get(`${base}?year=2014`))).toEqual([
        'tengah-2014',
        'awal-2014',
      ])
      expect(contents(await h.as(owner).get(`${base}?year=2014`))).toEqual([
        'rahasia-2014',
        'tengah-2014',
        'awal-2014',
      ])
      const first = await h.as(stranger).get(`${base}?year=2014&limit=1`)
      expect(contents(first)).toEqual(['tengah-2014'])
      const second = await h
        .as(stranger)
        .get(`${base}?year=2014&limit=1&cursor=${first.body.nextCursor}`)
      expect(contents(second)).toEqual(['awal-2014'])
      expect(second.body.nextCursor).toBeNull()
      expect(contents(await h.as(stranger).get(`${base}?year=2020`))).toEqual([])
    })

    it('year tidak valid: 400', async () => {
      const owner = await h.mkUser('owner')
      for (const bad of ['abc', '1800', '3000', '2014.5']) {
        expect((await h.as(owner).get(`/users/${owner.username}/posts?year=${bad}`)).status).toBe(
          400,
        )
      }
    })
  })
})
