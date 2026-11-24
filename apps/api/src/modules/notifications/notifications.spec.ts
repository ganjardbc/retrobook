// Tes integrasi notifikasi (T-32, NTF-01): pembuatan, daftar, unread-count, tandai terbaca, visibilitas.
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

describe('Notifikasi (integrasi)', () => {
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

  const mkPost = (author: User, extra: Record<string, unknown> = {}) =>
    h.prisma.post.create({
      data: { authorId: author.id, content: 'hi', privacy: 'PUBLIC', ...extra },
    })
  const list = async (u: User) => (await h.as(u).get('/notifications')).body.items
  const count = async (u: User) => (await h.as(u).get('/notifications/unread-count')).body.count

  it('tanpa token: 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/notifications')
    expect(res.status).toBe(401)
  })

  describe('pembuatan (NTF-01)', () => {
    it('like membuat notifikasi LIKE untuk penulis, lengkap dengan aktor dan teks', async () => {
      const author = await h.mkUser('author')
      const fan = await h.mkUser('fan')
      const post = await mkPost(author)
      expect((await h.as(fan).put(`/posts/${post.id}/like`)).status).toBe(200)
      const items = await list(author)
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        type: 'LIKE',
        postId: post.id,
        commentId: null,
        readAt: null,
        text: 'fan likes your post',
        actor: { id: fan.id, displayName: 'fan' },
      })
    })

    it('aksi pada konten sendiri tidak membuat notifikasi', async () => {
      const a = await h.mkUser('a')
      const post = await mkPost(a)
      await h.as(a).put(`/posts/${post.id}/like`)
      await h.as(a).post(`/posts/${post.id}/comments`).send({ content: 'x' })
      expect(await h.prisma.notification.count()).toBe(0)
    })

    it('like, unlike, like lagi: satu notifikasi saja', async () => {
      const author = await h.mkUser('author')
      const fan = await h.mkUser('fan')
      const post = await mkPost(author)
      await h.as(fan).put(`/posts/${post.id}/like`)
      await h.as(fan).del(`/posts/${post.id}/like`)
      await h.as(fan).put(`/posts/${post.id}/like`)
      await h.as(fan).put(`/posts/${post.id}/like`)
      expect(await h.prisma.notification.count()).toBe(1)
    })

    it('komentar membuat notifikasi COMMENT dengan commentId', async () => {
      const author = await h.mkUser('author')
      const c = await h.mkUser('c')
      const post = await mkPost(author)
      const res = await h.as(c).post(`/posts/${post.id}/comments`).send({ content: 'nice' })
      const [n] = await list(author)
      expect(n).toMatchObject({
        type: 'COMMENT',
        postId: post.id,
        commentId: res.body.id,
        text: 'c commented on your post',
      })
    })

    it('permintaan teman memberi FRIEND_REQUEST ke penerima; terima memberi FRIEND_ACCEPT ke pengirim', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      expect((await list(b)).map((n: { type: string }) => n.type)).toEqual(['FRIEND_REQUEST'])
      expect(await list(a)).toHaveLength(0)

      await h.as(b).post(`/friends/requests/${a.id}/accept`)
      await h.as(b).post(`/friends/requests/${a.id}/accept`) // diulang: tetap satu
      const forA = await list(a)
      expect(forA).toHaveLength(1)
      expect(forA[0]).toMatchObject({ type: 'FRIEND_ACCEPT', actor: { id: b.id } })
    })

    it('permintaan silang (otomatis diterima) memberi FRIEND_ACCEPT ke pengirim pertama', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.as(a).post('/friends/requests').send({ userId: b.id })
      await h.as(b).post('/friends/requests').send({ userId: a.id })
      expect((await list(a)).map((n: { type: string }) => n.type)).toEqual(['FRIEND_ACCEPT'])
    })

    it('pasangan saling blokir tidak membuat notifikasi (BR-11)', async () => {
      const author = await h.mkUser('author')
      const fan = await h.mkUser('fan')
      const post = await mkPost(author)
      await h.prisma.block.create({ data: { blockerId: author.id, blockedId: fan.id } })
      // like ditolak 404 oleh visibilitas; notifikasi tidak ikut terbuat
      await h.as(fan).put(`/posts/${post.id}/like`)
      expect(await h.prisma.notification.count()).toBe(0)
    })
  })

  describe('daftar, unread-count, tandai terbaca', () => {
    const seed = async () => {
      const author = await h.mkUser('author')
      const f1 = await h.mkUser('f1')
      const f2 = await h.mkUser('f2')
      const f3 = await h.mkUser('f3')
      const post = await mkPost(author)
      for (const f of [f1, f2, f3]) await h.as(f).put(`/posts/${post.id}/like`)
      return { author, f1, f2, f3, post }
    }

    it('terbaru di atas dengan cursor', async () => {
      const { author, f1, f2, f3 } = await seed()
      const p1 = (await h.as(author).get('/notifications?limit=2')).body
      expect(p1.items.map((n: { actor: { id: number } }) => n.actor.id)).toEqual([f3.id, f2.id])
      const p2 = (await h.as(author).get(`/notifications?limit=2&cursor=${p1.nextCursor}`)).body
      expect(p2.items.map((n: { actor: { id: number } }) => n.actor.id)).toEqual([f1.id])
      expect(p2.nextCursor).toBeNull()
    })

    it('unread-count turun setelah ditandai; ids hanya milik sendiri', async () => {
      const { author, f1, post } = await seed()
      expect(await count(author)).toBe(3)
      const [first] = await list(author)
      const res = await h
        .as(author)
        .post('/notifications/read')
        .send({ ids: [first.id] })
      expect(res.body).toEqual({ count: 2 })

      // f1 mencoba menandai notifikasi milik author: diabaikan
      await h.as(f1).post(`/posts/${post.id}/comments`).send({ content: 'x' })
      const mine = await h.prisma.notification.findFirstOrThrow({
        where: { userId: author.id, readAt: null },
      })
      await h
        .as(f1)
        .post('/notifications/read')
        .send({ ids: [mine.id] })
      expect(await count(author)).toBe(3)
    })

    it('tanpa ids: semua ditandai', async () => {
      const { author } = await seed()
      const res = await h.as(author).post('/notifications/read').send({})
      expect(res.body).toEqual({ count: 0 })
      expect((await list(author)).every((n: { readAt: string | null }) => n.readAt)).toBe(true)
    })

    it.each([[{ ids: 'x' }], [{ ids: [0] }], [{ foo: 1 }]])('body %j ditolak 400', async (body) => {
      const a = await h.mkUser('a')
      expect((await h.as(a).post('/notifications/read').send(body)).status).toBe(400)
    })
  })

  describe('visibilitas saat dibaca (R-03)', () => {
    const likedPost = async () => {
      const author = await h.mkUser('author')
      const fan = await h.mkUser('fan')
      const post = await mkPost(author)
      await h.as(fan).put(`/posts/${post.id}/like`)
      expect(await list(author)).toHaveLength(1)
      return { author, fan, post }
    }

    // Post `hidden` tetap terbaca penulisnya (postWhere), jadi tidak diuji di sini.
    it('post dihapus: notifikasi hilang dari daftar dan hitungan', async () => {
      const { author, post } = await likedPost()
      await h.prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } })
      expect(await list(author)).toHaveLength(0)
      expect(await count(author)).toBe(0)
    })

    it('aktor diblokir setelahnya: notifikasi hilang', async () => {
      const { author, fan } = await likedPost()
      await h.prisma.block.create({ data: { blockerId: author.id, blockedId: fan.id } })
      expect(await list(author)).toHaveLength(0)
      expect(await count(author)).toBe(0)
    })

    it('aktor BANNED: notifikasi hilang', async () => {
      const { author, fan } = await likedPost()
      await h.prisma.user.update({ where: { id: fan.id }, data: { status: 'BANNED' } })
      expect(await list(author)).toHaveLength(0)
    })

    it('komentar dihapus: notifikasi COMMENT hilang', async () => {
      const author = await h.mkUser('author')
      const c = await h.mkUser('c')
      const post = await mkPost(author)
      const res = await h.as(c).post(`/posts/${post.id}/comments`).send({ content: 'x' })
      expect(await list(author)).toHaveLength(1)
      await h.as(c).del(`/comments/${res.body.id}`)
      expect(await list(author)).toHaveLength(0)
    })

    it('notifikasi milik orang lain tidak pernah muncul', async () => {
      const { fan } = await likedPost()
      expect(await list(fan)).toHaveLength(0)
    })
  })

  it('realtime: notification:new sampai ke penerima saat ada like', async () => {
    const author = await h.mkUser('author')
    const fan = await h.mkUser('fan')
    const post = await mkPost(author)
    const s = io(url, {
      auth: { token: h.tokenOf(author) },
      transports: ['websocket'],
      reconnection: false,
    })
    open.push(s)
    await new Promise<void>((res, rej) => {
      s.on('connect', () => res())
      s.on('connect_error', rej)
    })
    const got = new Promise<Record<string, unknown>>((res) => s.once('notification:new', res))
    await h.as(fan).put(`/posts/${post.id}/like`)
    expect(await got).toMatchObject({ type: 'LIKE', postId: post.id, text: 'fan likes your post' })
  })
})
