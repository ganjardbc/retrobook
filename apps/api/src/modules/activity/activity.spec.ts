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
})
