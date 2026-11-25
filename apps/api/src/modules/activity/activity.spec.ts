// Tes integrasi Activity Log (T-68, ACT-01).
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

describe('Activity Log (integrasi)', () => {
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
  const at = (n: number) => new Date(Date.now() - n * 60_000)

  it('tanpa token 401; hanya aktivitas sendiri, terbaru dulu, dengan kursor', async () => {
    expect((await request(app.getHttpServer()).get('/api/activity')).status).toBe(401)
    const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
    const mine = await h.prisma.post.create({
      data: { authorId: me.id, content: 'post saya', privacy: 'PUBLIC', createdAt: at(30) },
    })
    const theirs = await h.prisma.post.create({
      data: { authorId: other.id, content: 'post mereka', privacy: 'PUBLIC', createdAt: at(40) },
    })
    await h.prisma.comment.create({
      data: { postId: theirs.id, authorId: me.id, content: 'komentar saya', createdAt: at(20) },
    })
    await h.prisma.like.create({ data: { userId: me.id, postId: theirs.id, createdAt: at(10) } })
    await h.prisma.comment.create({
      data: { postId: mine.id, authorId: other.id, content: 'komentar mereka', createdAt: at(5) },
    })

    const res = await h.as(me).get('/activity')
    expect(res.body.items.map((i: { type: string; text: string }) => [i.type, i.text])).toEqual([
      ['LIKE', 'post mereka'],
      ['COMMENT', 'komentar saya'],
      ['POST', 'post saya'],
    ])
    const first = await h.as(me).get('/activity?limit=2')
    expect(first.body.items).toHaveLength(2)
    const next = await h
      .as(me)
      .get(`/activity?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`)
    expect(next.body.items.map((i: { type: string }) => i.type)).toEqual(['POST'])
    expect(next.body.nextCursor).toBeNull()
  })

  it('tidak membuka konten yang tak lagi terlihat: post disembunyikan, diblokir, atau dihapus hilang dari log', async () => {
    const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
    const post = await h.prisma.post.create({
      data: { authorId: other.id, content: 'rahasia', privacy: 'PUBLIC' },
    })
    await h.prisma.comment.create({ data: { postId: post.id, authorId: me.id, content: 'kom' } })
    await h.prisma.like.create({ data: { userId: me.id, postId: post.id } })
    expect((await h.as(me).get('/activity')).body.items).toHaveLength(2)
    await h.prisma.post.update({ where: { id: post.id }, data: { hidden: true } })
    expect((await h.as(me).get('/activity')).body.items).toEqual([])
    await h.prisma.post.update({ where: { id: post.id }, data: { hidden: false } })
    await h.prisma.block.create({ data: { blockerId: other.id, blockedId: me.id } })
    expect((await h.as(me).get('/activity')).body.items).toEqual([])
  })

  it('menghapus lewat endpoint yang ada menghilangkannya dari log', async () => {
    const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
    const mine = await h.prisma.post.create({
      data: { authorId: me.id, content: 'hapus aku', privacy: 'PUBLIC' },
    })
    const post = await h.prisma.post.create({
      data: { authorId: other.id, content: 'x', privacy: 'PUBLIC' },
    })
    await h.as(me).put(`/posts/${post.id}/like`)
    expect((await h.as(me).get('/activity')).body.items).toHaveLength(2)
    expect((await h.as(me).del(`/posts/${mine.id}`)).status).toBeLessThan(300)
    expect((await h.as(me).del(`/posts/${post.id}/like`)).status).toBeLessThan(300)
    expect((await h.as(me).get('/activity')).body.items).toEqual([])
  })

  it('ticker teman: hanya teman yang chat dalam 60 menit, konten terlihat, terbaru dulu', async () => {
    const [me, friend, stranger, third] = await Promise.all([
      h.mkUser('me'),
      h.mkUser('friend'),
      h.mkUser('stranger'),
      h.mkUser('third'),
    ])
    await h.befriend(me, friend)
    await h.befriend(friend, third)
    expect((await request(app.getHttpServer()).get('/api/activity/friends')).status).toBe(401)
    const open = await h.prisma.post.create({
      data: { authorId: stranger.id, content: 'publik', privacy: 'PUBLIC', createdAt: at(30) },
    })
    const secret = await h.prisma.post.create({
      data: { authorId: third.id, content: 'rahasia', privacy: 'FRIENDS', createdAt: at(30) },
    })
    await h.prisma.post.create({
      data: { authorId: friend.id, content: 'post teman', privacy: 'PUBLIC', createdAt: at(20) },
    })
    await h.prisma.post.create({
      data: { authorId: stranger.id, content: 'bukan teman', privacy: 'PUBLIC', createdAt: at(15) },
    })
    await h.prisma.like.create({ data: { userId: friend.id, postId: open.id, createdAt: at(10) } })
    await h.prisma.comment.create({
      data: { postId: secret.id, authorId: friend.id, content: 'bocor?', createdAt: at(5) },
    })

    // Belum ada chat: ticker kosong walau ada aktivitas.
    expect((await h.as(me).get('/activity/friends')).body.items).toEqual([])
    const chat = (senderId: string, minutesAgo: number) =>
      h.prisma.message.create({
        data: { senderId, receiverId: me.id, content: 'hai', createdAt: at(minutesAgo) },
      })
    await chat(friend.id, 90) // di luar 60 menit
    expect((await h.as(me).get('/activity/friends')).body.items).toEqual([])
    await chat(friend.id, 10)

    const res = await h.as(me).get('/activity/friends')
    expect(res.status).toBe(200)
    expect(
      res.body.items.map((i: { type: string; actor: { id: string } }) => [i.type, i.actor.id]),
    ).toEqual([
      ['LIKE', friend.id],
      ['POST', friend.id],
    ])
    // Teman diblokir: aktivitasnya hilang dari ticker.
    await h.prisma.block.create({ data: { blockerId: me.id, blockedId: friend.id } })
    expect((await h.as(me).get('/activity/friends')).body.items).toEqual([])
  })
})
