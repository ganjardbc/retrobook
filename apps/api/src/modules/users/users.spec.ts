// Tes integrasi ke MySQL uji (PRF-01, BR-02, BR-05).
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

describe('Profil dan timeline (integrasi)', () => {
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

  const full = {
    displayName: 'Ashlyn Taylor',
    bio: 'Suka ski',
    birthday: new Date('1995-08-30T00:00:00.000Z'),
    hometown: 'London',
    currentCity: 'Bristol',
    workplace: 'Toko Buku',
    school: 'University of the West of England',
    avatarUrl: '/uploads/a.png',
    coverUrl: '/uploads/c.png',
  }

  describe('GET /users/:username', () => {
    it('mengembalikan profil lengkap tanpa data sensitif', async () => {
      const owner = await h.mkUser('owner', full)
      const viewer = await h.mkUser('viewer')
      const res = await h.as(viewer).get(`/users/${owner.username}`)
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        id: owner.id,
        username: owner.username,
        displayName: 'Ashlyn Taylor',
        avatarUrl: '/uploads/a.png',
        coverUrl: '/uploads/c.png',
        isBot: false,
        bio: 'Suka ski',
        birthday: '1995-08-30',
        hometown: 'London',
        currentCity: 'Bristol',
        workplace: 'Toko Buku',
        school: 'University of the West of England',
        friendCount: 0,
        relationship: 'NONE',
      })
      expect(res.body.createdAt).toEqual(expect.any(String))
      for (const secret of ['email', 'passwordHash', 'role', 'status', 'deletedAt', 'lastSeenAt']) {
        expect(res.body[secret]).toBeUndefined()
      }
      expect(JSON.stringify(res.body)).not.toContain('@example.com')
    })

    it('kolom kosong menjadi null', async () => {
      const owner = await h.mkUser('owner')
      const res = await h.as(owner).get(`/users/${owner.username}`)
      expect(res.body).toMatchObject({
        bio: null,
        birthday: null,
        hometown: null,
        coverUrl: null,
        avatarUrl: null,
      })
    })

    it('username tidak peka huruf besar; hasilnya memakai username asli', async () => {
      const owner = await h.mkUser('owner')
      const res = await h.as(owner).get(`/users/${owner.username.toUpperCase()}`)
      expect(res.status).toBe(200)
      expect(res.body.username).toBe(owner.username)
    })

    it.each([
      ['SELF', async (a: Awaited<ReturnType<typeof setup>>) => a.owner, 'SELF'],
      [
        'FRIENDS (saya mengirim)',
        async (a: Awaited<ReturnType<typeof setup>>) => (
          await h.befriend(a.viewer, a.owner),
          a.viewer
        ),
        'FRIENDS',
      ],
      [
        'FRIENDS (dia mengirim)',
        async (a: Awaited<ReturnType<typeof setup>>) => (
          await h.befriend(a.owner, a.viewer),
          a.viewer
        ),
        'FRIENDS',
      ],
      [
        'REQUEST_SENT',
        async (a: Awaited<ReturnType<typeof setup>>) => (
          await h.befriend(a.viewer, a.owner, 'PENDING'),
          a.viewer
        ),
        'REQUEST_SENT',
      ],
      [
        'REQUEST_RECEIVED',
        async (a: Awaited<ReturnType<typeof setup>>) => (
          await h.befriend(a.owner, a.viewer, 'PENDING'),
          a.viewer
        ),
        'REQUEST_RECEIVED',
      ],
      ['NONE', async (a: Awaited<ReturnType<typeof setup>>) => a.viewer, 'NONE'],
    ])('relationship %s', async (_n, prepare, expected) => {
      const a = await setup()
      const who = await prepare(a)
      const res = await h.as(who).get(`/users/${a.owner.username}`)
      expect(res.body.relationship).toBe(expected)
    })
    async function setup() {
      return { owner: await h.mkUser('owner'), viewer: await h.mkUser('viewer') }
    }

    it('friendCount hanya menghitung teman ACCEPTED yang tidak BANNED atau terhapus', async () => {
      const owner = await h.mkUser('owner')
      const viewer = await h.mkUser('viewer')
      await h.befriend(owner, await h.mkUser('f1'))
      await h.befriend(await h.mkUser('f2'), owner)
      await h.befriend(owner, await h.mkUser('pending'), 'PENDING')
      await h.befriend(owner, await h.mkUser('banned', { status: 'BANNED' }))
      await h.befriend(owner, await h.mkUser('gone', { deletedAt: new Date() }))
      const res = await h.as(viewer).get(`/users/${owner.username}`)
      expect(res.body.friendCount).toBe(2)
    })

    it('tidak ada, BANNED, atau terhapus: 404 dengan body yang sama', async () => {
      const viewer = await h.mkUser('viewer')
      const banned = await h.mkUser('banned', { status: 'BANNED' })
      const gone = await h.mkUser('gone', { deletedAt: new Date() })
      const missing = await h.as(viewer).get('/users/tidak_ada_sama_sekali')
      expect(missing.status).toBe(404)
      for (const u of [banned, gone]) {
        const res = await h.as(viewer).get(`/users/${u.username}`)
        expect(res.status).toBe(404)
        expect(res.body).toEqual(missing.body)
      }
    })

    it('akun SUSPENDED tetap terlihat (BR-05)', async () => {
      const viewer = await h.mkUser('viewer')
      const suspended = await h.mkUser('susp', { status: 'SUSPENDED' })
      expect((await h.as(viewer).get(`/users/${suspended.username}`)).status).toBe(200)
    })

    it('tanpa login: 401', async () => {
      const owner = await h.mkUser('owner')
      expect((await request(app.getHttpServer()).get(`/api/users/${owner.username}`)).status).toBe(
        401,
      )
      expect(
        (await request(app.getHttpServer()).get(`/api/users/${owner.username}/posts`)).status,
      ).toBe(401)
    })
  })

  describe('GET /users/:username/posts (timeline)', () => {
    const seed = async () => {
      const owner = await h.mkUser('owner')
      const friend = await h.mkUser('friend')
      const stranger = await h.mkUser('stranger')
      await h.befriend(owner, friend)
      const mk = (content: string, extra: object = {}) =>
        h.prisma.post.create({ data: { authorId: owner.id, content, privacy: 'PUBLIC', ...extra } })
      await mk('publik')
      await mk('teman', { privacy: 'FRIENDS' })
      await mk('pribadi', { privacy: 'ONLY_ME' })
      await mk('disembunyikan', { hidden: true })
      await mk('dihapus', { deletedAt: new Date() })
      return { owner, friend, stranger }
    }
    const contents = (r: { body: { items: { content: string }[] } }) =>
      r.body.items.map((p) => p.content)

    it('pemilik melihat semua kecuali yang dihapus; teman melihat PUBLIC dan FRIENDS; asing hanya PUBLIC; terbaru dulu', async () => {
      const { owner, friend, stranger } = await seed()
      expect(contents(await h.as(owner).get(`/users/${owner.username}/posts`))).toEqual([
        'disembunyikan',
        'pribadi',
        'teman',
        'publik',
      ])
      expect(contents(await h.as(friend).get(`/users/${owner.username}/posts`))).toEqual([
        'teman',
        'publik',
      ])
      expect(contents(await h.as(stranger).get(`/users/${owner.username}/posts`))).toEqual([
        'publik',
      ])
    })

    it('hanya post milik pemilik profil (bukan post teman-temannya)', async () => {
      const { owner, friend } = await seed()
      await h.prisma.post.create({
        data: { authorId: friend.id, content: 'milik teman', privacy: 'PUBLIC' },
      })
      expect(contents(await h.as(friend).get(`/users/${owner.username}/posts`))).not.toContain(
        'milik teman',
      )
    })

    it('berhalaman dengan kursor: 10 per halaman, tanpa duplikat', async () => {
      const owner = await h.mkUser('owner')
      for (let i = 1; i <= 23; i++) {
        await h.prisma.post.create({
          data: { authorId: owner.id, content: `p${i}`, privacy: 'PUBLIC' },
        })
      }
      const p1 = (await h.as(owner).get(`/users/${owner.username}/posts`)).body
      expect(p1.items).toHaveLength(10)
      expect(p1.items[0].content).toBe('p23')
      const p2 = (await h.as(owner).get(`/users/${owner.username}/posts?cursor=${p1.nextCursor}`))
        .body
      const p3 = (await h.as(owner).get(`/users/${owner.username}/posts?cursor=${p2.nextCursor}`))
        .body
      expect(p3.items.map((p: { content: string }) => p.content)).toEqual(['p3', 'p2', 'p1'])
      expect(p3.nextCursor).toBeNull()
      expect((await h.as(owner).get(`/users/${owner.username}/posts?limit=51`)).status).toBe(400)
    })

    it('bentuk objek sama dengan feed (penulis, likedByMe, jumlah)', async () => {
      const { owner, friend } = await seed()
      const first = (await h.as(friend).get(`/users/${owner.username}/posts`)).body.items[0]
      expect(first).toMatchObject({
        author: { id: owner.id },
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
      })
    })

    it('profil tidak ada, BANNED, atau terhapus: 404 pada timeline juga', async () => {
      const viewer = await h.mkUser('viewer')
      const banned = await h.mkUser('banned', { status: 'BANNED' })
      await h.prisma.post.create({ data: { authorId: banned.id, content: 'x', privacy: 'PUBLIC' } })
      expect((await h.as(viewer).get('/users/tidak_ada/posts')).status).toBe(404)
      expect((await h.as(viewer).get(`/users/${banned.username}/posts`)).status).toBe(404)
    })
  })
})
