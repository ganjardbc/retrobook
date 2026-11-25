// Tes integrasi wall post dan tag (T-35, WAL-01, WAL-02, BR-04, NTF-01).
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
import { testHelpers, MISSING_ID } from '../../test/helpers'

describe('Wall post dan tag (integrasi)', () => {
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

  /** alice menulis di dinding bob. carol berteman dengan keduanya; dave hanya dengan alice; erin hanya dengan bob. */
  const world = async () => {
    const [alice, bob, carol, dave, erin, stranger] = (await Promise.all(
      ['alice', 'bob', 'carol', 'dave', 'erin', 'stranger'].map((n) => h.mkUser(n)),
    )) as [User, User, User, User, User, User]
    await h.befriend(alice, bob)
    await h.befriend(carol, alice)
    await h.befriend(carol, bob)
    await h.befriend(dave, alice)
    await h.befriend(erin, bob)
    return { alice, bob, carol, dave, erin, stranger }
  }
  const wall = async (author: User, owner: User, extra: Record<string, unknown> = {}) =>
    h
      .as(author)
      .post('/posts')
      .send({ content: 'hi bob', wallOwnerUsername: owner.username, ...extra })
  const types = async (u: User) =>
    (await h.as(u).get('/notifications')).body.items.map((n: { type: string }) => n.type)

  describe('membuat wall post (WAL-01)', () => {
    it('teman: 201, wallOwner terisi, privasi dipaksa FRIENDS, notifikasi WALL_POST ke pemilik dinding', async () => {
      const { alice, bob } = await world()
      const res = await wall(alice, bob, { privacy: 'PUBLIC' })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        author: { id: alice.id },
        wallOwner: { id: bob.id },
        privacy: 'FRIENDS',
        tags: [],
      })
      const n = (await h.as(bob).get('/notifications')).body.items
      expect(n).toHaveLength(1)
      expect(n[0]).toMatchObject({
        type: 'WALL_POST',
        postId: res.body.id,
        actor: { id: alice.id },
        text: 'alice posted on your wall',
      })
      expect(await types(alice)).toEqual([])
    })

    it('tanpa wallOwnerUsername: post biasa (wallOwner null)', async () => {
      const { alice } = await world()
      const res = await h.as(alice).post('/posts').send({ content: 'x', wallOwnerUsername: null })
      expect(res.status).toBe(201)
      expect(res.body.wallOwner).toBeNull()
    })

    it.each([
      ['bukan teman', async (w: Awaited<ReturnType<typeof world>>) => w.stranger],
      [
        'permintaan PENDING',
        async (w: Awaited<ReturnType<typeof world>>) => {
          const u = await h.mkUser('pend')
          await h.befriend(w.alice, u, 'PENDING')
          return u
        },
      ],
      [
        'diblokir',
        async (w: Awaited<ReturnType<typeof world>>) => {
          await h.prisma.friendship.deleteMany({
            where: { OR: [{ requesterId: w.bob.id }, { addresseeId: w.bob.id }] },
          })
          await h.prisma.block.create({ data: { blockerId: w.bob.id, blockedId: w.alice.id } })
          return w.bob
        },
      ],
      [
        'BANNED',
        async (w: Awaited<ReturnType<typeof world>>) => {
          await h.prisma.user.update({ where: { id: w.bob.id }, data: { status: 'BANNED' } })
          return w.bob
        },
      ],
    ])('pemilik dinding %s: 404 yang sama, tanpa post dan notifikasi', async (_n, pick) => {
      const w = await world()
      const owner = await pick(w)
      const res = await wall(w.alice, owner)
      expect(res.status).toBe(404)
      expect(await h.prisma.post.count()).toBe(0)
      expect(await h.prisma.notification.count()).toBe(0)
    })

    it('username tidak ada: 404; dinding sendiri: 422; ONLY_ME: 400', async () => {
      const { alice, bob } = await world()
      expect(
        (await h.as(alice).post('/posts').send({ content: 'x', wallOwnerUsername: 'nobody' }))
          .status,
      ).toBe(404)
      const self = await wall(alice, alice)
      expect(self.status).toBe(422)
      expect(self.body.code).toBe('SELF_ACTION_NOT_ALLOWED')
      expect((await wall(alice, bob, { privacy: 'ONLY_ME' })).status).toBe(400)
      expect(await h.prisma.post.count()).toBe(0)
    })
  })

  describe('visibilitas wall post (BR-04)', () => {
    it.each([
      ['alice (penulis)', 'alice', true],
      ['bob (pemilik dinding)', 'bob', true],
      ['carol (teman keduanya)', 'carol', true],
      ['dave (teman penulis saja)', 'dave', false],
      ['erin (teman pemilik dinding saja)', 'erin', false],
      ['stranger', 'stranger', false],
    ] as const)('%s: %s', async (_label, who, canSee) => {
      const w = await world()
      const post = (await wall(w.alice, w.bob)).body
      const viewer = w[who]
      const get = await h.as(viewer).get(`/posts/${post.id}`)
      expect(get.status).toBe(canSee ? 200 : 404)
      const inBobTimeline =
        (await h.as(viewer).get(`/users/${w.bob.username}/posts`)).body.items ?? []
      expect(inBobTimeline.some((p: { id: string }) => p.id === post.id)).toBe(canSee)
      const feed = (await h.as(viewer).get('/feed')).body.items
      expect(feed.some((p: { id: string }) => p.id === post.id)).toBe(canSee)
    })

    it('teman keduanya yang memblokir penulis tidak melihatnya; unfriend carol-bob menyembunyikannya', async () => {
      const w = await world()
      const post = (await wall(w.alice, w.bob)).body
      expect((await h.as(w.carol).get(`/posts/${post.id}`)).status).toBe(200)
      await h.prisma.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: w.carol.id, addresseeId: w.bob.id },
            { requesterId: w.bob.id, addresseeId: w.carol.id },
          ],
        },
      })
      expect((await h.as(w.carol).get(`/posts/${post.id}`)).status).toBe(404)

      await h.befriend(w.carol, w.bob)
      await h.prisma.block.create({ data: { blockerId: w.carol.id, blockedId: w.alice.id } })
      expect((await h.as(w.carol).get(`/posts/${post.id}`)).status).toBe(404)
    })

    it('muncul di timeline pemilik dinding dan penulis', async () => {
      const w = await world()
      const post = (await wall(w.alice, w.bob)).body
      for (const owner of [w.alice, w.bob]) {
        const items = (await h.as(w.carol).get(`/users/${owner.username}/posts`)).body.items
        expect(items.map((p: { id: string }) => p.id)).toContain(post.id)
      }
    })

    it('pemilik dinding dan penulis boleh menghapus; teman lain 403; yang tak berhak 404', async () => {
      const w = await world()
      const mk = async () => (await wall(w.alice, w.bob)).body.id as number
      expect((await h.as(w.bob).del(`/posts/${await mk()}`)).status).toBe(204)
      expect((await h.as(w.alice).del(`/posts/${await mk()}`)).status).toBe(204)
      const id = await mk()
      expect((await h.as(w.carol).del(`/posts/${id}`)).status).toBe(403)
      expect((await h.as(w.dave).del(`/posts/${id}`)).status).toBe(404)
      expect((await h.as(w.stranger).del(`/posts/${id}`)).status).toBe(404)
      expect((await h.as(w.alice).get(`/posts/${id}`)).status).toBe(200)
    })

    it('pemilik dinding tidak bisa mengedit post penulis', async () => {
      const w = await world()
      const id = (await wall(w.alice, w.bob)).body.id
      const res = await h.as(w.bob).patch(`/posts/${id}`).send({ content: 'diubah' })
      expect(res.status).toBe(403)
    })
  })

  describe('tag teman (WAL-02)', () => {
    it('tag teman: tags terisi di respons dan di feed, notifikasi TAG ke yang di-tag', async () => {
      const w = await world()
      const res = await h
        .as(w.alice)
        .post('/posts')
        .send({ content: 'x', taggedUserIds: [w.bob.id, w.carol.id] })
      expect(res.status).toBe(201)
      expect(res.body.tags.map((t: { id: string }) => t.id).sort()).toEqual(
        [w.bob.id, w.carol.id].sort(),
      )
      expect(await types(w.bob)).toEqual(['TAG'])
      expect(await types(w.carol)).toEqual(['TAG'])
      expect(await types(w.dave)).toEqual([])
      const n = (await h.as(w.bob).get('/notifications')).body.items[0]
      expect(n).toMatchObject({ postId: res.body.id, text: 'alice tagged you in a post' })
      const feed = (await h.as(w.carol).get('/feed')).body.items
      expect(feed[0].tags).toHaveLength(2)
    })

    it.each([
      ['bukan teman', (w: Awaited<ReturnType<typeof world>>) => [w.stranger.id]],
      ['diri sendiri', (w: Awaited<ReturnType<typeof world>>) => [w.alice.id]],
      ['id tidak ada', () => [MISSING_ID]],
      ['sebagian bukan teman', (w: Awaited<ReturnType<typeof world>>) => [w.bob.id, w.stranger.id]],
    ])('tag %s: 422, tanpa post dan notifikasi', async (_n, ids) => {
      const w = await world()
      const res = await h
        .as(w.alice)
        .post('/posts')
        .send({ content: 'x', taggedUserIds: ids(w) })
      expect(res.status).toBe(422)
      expect(await h.prisma.post.count()).toBe(0)
      expect(await h.prisma.notification.count()).toBe(0)
    })

    it('lebih dari 10, duplikat, atau bukan angka: 400', async () => {
      const w = await world()
      const post = (ids: unknown) =>
        h.as(w.alice).post('/posts').send({ content: 'x', taggedUserIds: ids })
      expect((await post(Array.from({ length: 11 }, (_, i) => i + 1))).status).toBe(400)
      expect((await post([w.bob.id, w.bob.id])).status).toBe(400)
      expect((await post(['a'])).status).toBe(400)
      expect((await post([0])).status).toBe(400)
    })

    it('yang di-tag tidak bisa melihat post (ONLY_ME): tidak dinotifikasi', async () => {
      const w = await world()
      const res = await h
        .as(w.alice)
        .post('/posts')
        .send({ content: 'x', privacy: 'ONLY_ME', taggedUserIds: [w.bob.id] })
      expect(res.status).toBe(201)
      expect(await types(w.bob)).toEqual([])
    })

    it('wall post: teman penulis yang bukan teman pemilik dinding tidak dinotifikasi; pemilik dinding hanya WALL_POST', async () => {
      const w = await world()
      const res = await wall(w.alice, w.bob, { taggedUserIds: [w.dave.id, w.carol.id, w.bob.id] })
      expect(res.status).toBe(201)
      expect(await types(w.dave)).toEqual([]) // tidak bisa melihat post ini
      expect(await types(w.carol)).toEqual(['TAG'])
      expect(await types(w.bob)).toEqual(['WALL_POST']) // tanpa TAG ganda
    })

    it('tag yang kemudian BANNED atau diblokir pembaca tidak ditampilkan', async () => {
      const w = await world()
      const id = (
        await h
          .as(w.alice)
          .post('/posts')
          .send({ content: 'x', taggedUserIds: [w.bob.id, w.carol.id] })
      ).body.id
      await h.prisma.user.update({ where: { id: w.bob.id }, data: { status: 'BANNED' } })
      await h.prisma.block.create({ data: { blockerId: w.dave.id, blockedId: w.carol.id } })
      const forAlice = (await h.as(w.alice).get(`/posts/${id}`)).body.tags.map(
        (t: { id: string }) => t.id,
      )
      expect(forAlice).toEqual([w.carol.id])
      const forDave = (await h.as(w.dave).get(`/posts/${id}`)).body.tags
      expect(forDave).toEqual([])
    })

    it('edit post tidak menerima wallOwnerUsername atau taggedUserIds (400)', async () => {
      const w = await world()
      const id = (await h.as(w.alice).post('/posts').send({ content: 'x' })).body.id
      expect(
        (
          await h
            .as(w.alice)
            .patch(`/posts/${id}`)
            .send({ taggedUserIds: [w.bob.id] })
        ).status,
      ).toBe(400)
      expect(
        (await h.as(w.alice).patch(`/posts/${id}`).send({ wallOwnerUsername: w.bob.username }))
          .status,
      ).toBe(400)
    })
  })

  describe('notifikasi wall post dan tag saat dibaca', () => {
    it('post dihapus: notifikasi WALL_POST dan TAG hilang dari daftar', async () => {
      const w = await world()
      const id = (await wall(w.alice, w.bob, { taggedUserIds: [w.carol.id] })).body.id
      expect(await types(w.bob)).toEqual(['WALL_POST'])
      await h.as(w.alice).del(`/posts/${id}`)
      expect(await types(w.bob)).toEqual([])
      expect(await types(w.carol)).toEqual([])
    })
  })
})
