// Tes integrasi hashtag dan trending (T-42, POST-10, SRC-02, ADM-17, BR-02, 03, 05, 11).
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

describe('Hashtag dan trending (integrasi)', () => {
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

  const post = (u: User, content: string, privacy = 'PUBLIC') =>
    h.as(u).post('/posts').send({ content, privacy })
  const tagsOf = async (postId: number) =>
    (
      await h.prisma.postHashtag.findMany({
        where: { postId },
        select: { hashtag: { select: { tag: true } } },
      })
    )
      .map((r) => r.hashtag.tag)
      .sort()
  const trending = async (u: User) =>
    (await h.as(u).get('/trending')).body.items as { tag: string; count: number }[]
  const page = (u: User, tag: string, qs = '') => h.as(u).get(`/hashtags/${tag}/posts${qs}`)

  it('tanpa token: 401', async () => {
    const http = request(app.getHttpServer())
    expect((await http.get('/api/trending')).status).toBe(401)
    expect((await http.get('/api/hashtags/a/posts')).status).toBe(401)
  })

  describe('ekstraksi saat menulis (POST-10)', () => {
    it('membuat hashtag huruf kecil, unik, dan tidak mengenali "a#b", kata terlalu panjang, atau # kosong', async () => {
      const me = await h.mkUser('me')
      const long = 'x'.repeat(51)
      const res = await post(me, `Hi #Retro #retro #Kuliner_2015 a#nope #${long} # #  &#39; #ok.`)
      expect(res.status).toBe(201)
      expect(await tagsOf(res.body.id)).toEqual(['kuliner_2015', 'ok', 'retro'])
    })

    it('maksimal 10 hashtag per post', async () => {
      const me = await h.mkUser('me')
      const res = await post(me, Array.from({ length: 12 }, (_, i) => `#t${i}`).join(' '))
      expect(await tagsOf(res.body.id)).toHaveLength(10)
    })

    it('mengedit menambah dan mencabut tag; tag yang tetap tidak dibuat ulang', async () => {
      const me = await h.mkUser('me')
      const created = await post(me, '#a #b')
      const longAgo = new Date(Date.now() - 48 * 3600_000)
      await h.prisma.postHashtag.updateMany({
        where: { postId: created.body.id, hashtag: { tag: 'b' } },
        data: { createdAt: longAgo },
      })
      const res = await h.as(me).patch(`/posts/${created.body.id}`).send({ content: '#b #c' })
      expect(res.status).toBe(200)
      expect(await tagsOf(created.body.id)).toEqual(['b', 'c'])
      const kept = await h.prisma.postHashtag.findFirst({
        where: { postId: created.body.id, hashtag: { tag: 'b' } },
      })
      expect(kept!.createdAt).toEqual(longAgo)
    })

    it('share mengekstrak hashtag dari komentar pembagi', async () => {
      const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
      const original = await post(other, 'asal')
      const res = await h.as(me).post(`/posts/${original.body.id}/share`).send({ content: '#bagi' })
      expect(res.status).toBe(201)
      expect(await tagsOf(res.body.id)).toEqual(['bagi'])
    })
  })

  describe('GET /trending (SRC-02)', () => {
    it('mengurutkan berdasarkan jumlah post, lalu id; maksimal 10', async () => {
      const me = await h.mkUser('me')
      await post(me, '#solo')
      await post(me, '#duo')
      await post(me, '#duo')
      for (let i = 0; i < 10; i++) await post(me, `#filler${i}`)
      const items = await trending(me)
      expect(items).toHaveLength(10)
      expect(items[0]).toEqual({ tag: 'duo', count: 2 })
    })

    it('hanya post publik biasa: FRIENDS, ONLY_ME, wall post, hidden, dan terhapus tidak dihitung', async () => {
      const [me, friend] = await Promise.all([h.mkUser('me'), h.mkUser('friend')])
      await h.befriend(me, friend)
      await post(friend, '#fr', 'FRIENDS')
      await post(friend, '#om', 'ONLY_ME')
      await h.as(friend).post('/posts').send({ content: '#wall', wallOwnerUsername: me.username })
      const hidden = await post(friend, '#hid')
      await h.prisma.post.update({ where: { id: hidden.body.id }, data: { hidden: true } })
      const del = await post(friend, '#del')
      await h.as(friend).del(`/posts/${del.body.id}`)
      await post(friend, '#ok')
      expect(await trending(me)).toEqual([{ tag: 'ok', count: 1 }])
    })

    it('penulis BANNED dan pasangan blokir tidak dihitung', async () => {
      const [me, banned, blocked, fine] = (await Promise.all(
        ['me', 'banned', 'blocked', 'fine'].map((n) => h.mkUser(n)),
      )) as [User, User, User, User]
      await post(banned, '#ban')
      await post(blocked, '#blk')
      await post(fine, '#fine')
      await h.prisma.user.update({ where: { id: banned.id }, data: { status: 'BANNED' } })
      await h.prisma.block.create({ data: { blockerId: me.id, blockedId: blocked.id } })
      expect((await trending(me)).map((i) => i.tag)).toEqual(['fine'])
      // Pembaca lain tetap melihat tag milik yang diblokir `me`.
      expect((await trending(fine)).map((i) => i.tag)).toEqual(['blk', 'fine'])
    })

    it('hashtag hidden disembunyikan (ADM-17) dan tautan lebih tua dari 24 jam tidak dihitung', async () => {
      const me = await h.mkUser('me')
      await post(me, '#hidden')
      const old = await post(me, '#old')
      await post(me, '#new')
      await h.prisma.hashtag.update({ where: { tag: 'hidden' }, data: { hidden: true } })
      await h.prisma.postHashtag.updateMany({
        where: { postId: old.body.id },
        data: { createdAt: new Date(Date.now() - 25 * 3600_000) },
      })
      expect((await trending(me)).map((i) => i.tag)).toEqual(['new'])
    })
  })

  describe('GET /hashtags/:tag/posts', () => {
    it('hanya post publik; tidak peduli huruf besar; teman pun tidak melihat post FRIENDS di sini', async () => {
      const [me, friend] = await Promise.all([h.mkUser('me'), h.mkUser('friend')])
      await h.befriend(me, friend)
      const pub = await post(friend, 'a #Retro')
      await post(friend, 'b #retro', 'FRIENDS')
      await post(me, 'c #retro', 'ONLY_ME')
      const res = await page(me, 'RETRO')
      expect(res.status).toBe(200)
      expect(res.body.items.map((p: { id: number }) => p.id)).toEqual([pub.body.id])
      expect(res.body.nextCursor).toBeNull()
    })

    it('post terhapus, hidden, penulis BANNED, dan pasangan blokir tidak muncul', async () => {
      const [me, a, b, c, ok] = (await Promise.all(
        ['me', 'a', 'b', 'c', 'ok'].map((n) => h.mkUser(n)),
      )) as [User, User, User, User, User]
      const del = await post(a, '#t')
      await h.as(a).del(`/posts/${del.body.id}`)
      const hid = await post(a, '#t')
      await h.prisma.post.update({ where: { id: hid.body.id }, data: { hidden: true } })
      await post(b, '#t')
      await h.prisma.user.update({ where: { id: b.id }, data: { status: 'BANNED' } })
      await post(c, '#t')
      await h.prisma.block.create({ data: { blockerId: c.id, blockedId: me.id } })
      const good = await post(ok, '#t')
      const res = await page(me, 't')
      expect(res.body.items.map((p: { id: number }) => p.id)).toEqual([good.body.id])
    })

    it('pagination cursor: terbaru dulu; tag tidak dikenal memberi daftar kosong', async () => {
      const me = await h.mkUser('me')
      const ids: number[] = []
      for (let i = 0; i < 3; i++) ids.push((await post(me, `#p ${i}`)).body.id)
      const first = await page(me, 'p', '?limit=2')
      expect(first.body.items.map((p: { id: number }) => p.id)).toEqual([ids[2], ids[1]])
      const second = await page(me, 'p', `?limit=2&cursor=${first.body.nextCursor}`)
      expect(second.body.items.map((p: { id: number }) => p.id)).toEqual([ids[0]])
      expect(second.body.nextCursor).toBeNull()
      const none = await page(me, 'tidakada')
      expect(none.body).toEqual({ items: [], nextCursor: null })
    })
  })
})
