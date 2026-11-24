// Tes integrasi sort feed (T-43, POST-09). Aturan visibilitas tetap dari feedWhere (R-03).
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

describe('Sort feed (integrasi)', () => {
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

  const ids = (res: { body: { items: { id: number }[] } }) => res.body.items.map((p) => p.id)
  /** Buat post milik `author` dengan `likes` penyuka (pengguna baru). Dibuat berurutan, jadi id naik = lebih baru. */
  const mkPost = async (author: User, likes: number, privacy: 'FRIENDS' | 'PUBLIC' = 'FRIENDS') => {
    const post = await h.prisma.post.create({
      data: { authorId: author.id, content: 'p', privacy },
    })
    for (let i = 0; i < likes; i++) {
      const liker = await h.mkUser('liker')
      await h.prisma.like.create({ data: { userId: liker.id, postId: post.id } })
    }
    return post.id
  }

  it('top: jumlah like terbanyak dulu, seri diurut terbaru; recent tetap terbaru dulu', async () => {
    const me = await h.mkUser('me')
    const a = await mkPost(me, 1)
    const b = await mkPost(me, 3)
    const c = await mkPost(me, 0)
    const d = await mkPost(me, 1)
    expect(ids(await h.as(me).get('/feed?sort=top'))).toEqual([b, d, a, c])
    expect(ids(await h.as(me).get('/feed?sort=recent'))).toEqual([d, c, b, a])
    expect(ids(await h.as(me).get('/feed'))).toEqual([d, c, b, a])
  })

  it('top: pagination kursor menelusuri seluruh urutan tanpa duplikat atau lompatan', async () => {
    const me = await h.mkUser('me')
    const made: number[] = []
    for (const likes of [2, 0, 3, 1, 1, 0, 2]) made.push(await mkPost(me, likes))
    const full = ids(await h.as(me).get('/feed?sort=top&limit=50'))
    expect(full).toHaveLength(7)
    const walked: number[] = []
    let cursor: number | null = null
    for (let guard = 0; guard < 10; guard++) {
      const res = await h.as(me).get(`/feed?sort=top&limit=3${cursor ? `&cursor=${cursor}` : ''}`)
      walked.push(...ids(res))
      cursor = res.body.nextCursor
      if (cursor === null) break
    }
    expect(walked).toEqual(full)
    expect([...walked].sort()).toEqual([...made].sort())
  })

  it('top tidak melonggarkan visibilitas: post orang asing atau FRIENDS non-teman tidak muncul walau banyak like', async () => {
    const [me, friend, stranger] = (await Promise.all(
      ['me', 'friend', 'stranger'].map((n) => h.mkUser(n)),
    )) as [User, User, User]
    await h.befriend(me, friend)
    const mine = await mkPost(friend, 0)
    await mkPost(stranger, 5, 'PUBLIC')
    const hidden = await mkPost(friend, 4)
    await h.prisma.post.update({ where: { id: hidden }, data: { hidden: true } })
    expect(ids(await h.as(me).get('/feed?sort=top'))).toEqual([mine])
  })

  it('sort tidak dikenal: 400', async () => {
    const me = await h.mkUser('me')
    expect((await h.as(me).get('/feed?sort=hot')).status).toBe(400)
  })
})
