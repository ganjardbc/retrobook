// SRC-05: pencarian isi post harus mengikuti aturan visibilitas terpusat (R-03).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Privacy } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Pencarian isi post (integrasi)', () => {
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

  const post = (authorId: number, content: string, extra: object = {}) =>
    h.prisma.post.create({ data: { authorId, content, privacy: Privacy.PUBLIC, ...extra } })
  const contents = (res: { body: { items: { content: string }[] } }) =>
    res.body.items.map((i) => i.content)

  it('cocok pada isi tanpa membedakan huruf besar kecil; kata kunci pendek 400; tanpa token 401', async () => {
    const alice = await h.mkUser('alice')
    await post(alice.id, 'Nostalgia Kopi Pagi')
    await post(alice.id, 'lainnya')
    const res = await h.as(alice).get('/search/posts?q=kopi').expect(200)
    expect(contents(res)).toEqual(['Nostalgia Kopi Pagi'])
    await h.as(alice).get('/search/posts?q=k').expect(400)
    await request(app.getHttpServer()).get('/api/search/posts?q=kopi').expect(401)
  })

  it('% dan _ dicocokkan apa adanya', async () => {
    const alice = await h.mkUser('alice')
    await post(alice.id, 'diskon 50% hari ini')
    await post(alice.id, 'diskon 50 persen')
    expect(contents(await h.as(alice).get('/search/posts?q=50%25'))).toEqual([
      'diskon 50% hari ini',
    ])
  })

  it('mengikuti privasi: FRIENDS hanya untuk teman, ONLY_ME hanya penulis', async () => {
    const [alice, bob, eve] = [
      await h.mkUser('alice'),
      await h.mkUser('bob'),
      await h.mkUser('eve'),
    ]
    await h.befriend(alice, bob)
    await post(alice.id, 'rahasia teman', { privacy: Privacy.FRIENDS })
    await post(alice.id, 'rahasia sendiri', { privacy: Privacy.ONLY_ME })
    expect(contents(await h.as(bob).get('/search/posts?q=rahasia'))).toEqual(['rahasia teman'])
    expect(contents(await h.as(eve).get('/search/posts?q=rahasia'))).toEqual([])
    expect(contents(await h.as(alice).get('/search/posts?q=rahasia')).sort()).toEqual([
      'rahasia sendiri',
      'rahasia teman',
    ])
  })

  it('blokir dua arah, penulis BANNED, hidden, dan terhapus tidak muncul', async () => {
    const alice = await h.mkUser('alice')
    const bob = await h.mkUser('bob')
    const carol = await h.mkUser('carol')
    const banned = await h.mkUser('banned', { status: 'BANNED' })
    await post(bob.id, 'kata sandi blokir')
    await post(banned.id, 'kata sandi banned')
    await post(alice.id, 'kata sandi hidden', { hidden: true })
    await post(alice.id, 'kata sandi hapus', { deletedAt: new Date() })
    await post(alice.id, 'kata sandi ok')
    await h.prisma.block.create({ data: { blockerId: bob.id, blockedId: carol.id } })
    expect(contents(await h.as(carol).get('/search/posts?q=sandi'))).toEqual(['kata sandi ok'])
    // Arah sebaliknya: yang diblokir juga tidak melihat post pemblokir.
    expect(contents(await h.as(bob).get('/search/posts?q=blokir'))).toEqual(['kata sandi blokir'])
  })

  it('paginasi dengan nextCursor', async () => {
    const alice = await h.mkUser('alice')
    for (let i = 0; i < 3; i++) await post(alice.id, `halaman ${i}`)
    const p1 = await h.as(alice).get('/search/posts?q=halaman&limit=2').expect(200)
    expect(p1.body.items).toHaveLength(2)
    const p2 = await h.as(alice).get(`/search/posts?q=halaman&limit=2&cursor=${p1.body.nextCursor}`)
    expect(p2.body.items).toHaveLength(1)
    expect(p2.body.nextCursor).toBeNull()
  })

  it('kecocokan tak terlihat yang banyak tidak menutupi hasil terlihat di batch berikutnya', async () => {
    const alice = await h.mkUser('alice')
    const bob = await h.mkUser('bob')
    await post(alice.id, 'sandi lama terlihat') // id kecil: ada di batch kedua
    await h.prisma.post.createMany({
      data: Array.from({ length: 600 }, () => ({
        authorId: bob.id,
        content: 'sandi rahasia bob',
        privacy: Privacy.ONLY_ME,
      })),
    })
    const res = await h.as(alice).get('/search/posts?q=sandi&limit=10').expect(200)
    expect(contents(res)).toEqual(['sandi lama terlihat'])
    expect(res.body.nextCursor).toBeNull()
  })
})
