// Tes integrasi kata terlarang (T-56, ADM-11, BR-08): konten ditandai, tidak diblokir.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../../app.module'
import { configureApp } from '../../../common/configure-app'
import { resetDb } from '../../../test/db'
import { testHelpers } from '../../../test/helpers'

describe('Kata terlarang (integrasi)', () => {
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

  it('non-admin 403; admin menambah (huruf kecil, dirapikan), duplikat 409, hapus, semua tercatat di audit', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    expect((await h.as(user).get('/admin/blocked-words')).status).toBe(403)
    const add = await h.as(admin).post('/admin/blocked-words').send({ word: '  JUDI ' })
    expect([add.status, add.body.word]).toEqual([201, 'judi'])
    expect((await h.as(admin).post('/admin/blocked-words').send({ word: 'judi' })).status).toBe(409)
    expect((await h.as(admin).post('/admin/blocked-words').send({ word: 'a' })).status).toBe(400)
    expect((await h.as(admin).get('/admin/blocked-words')).body.items).toHaveLength(1)
    expect((await h.as(admin).del(`/admin/blocked-words/${add.body.id}`)).status).toBe(200)
    expect((await h.as(admin).del(`/admin/blocked-words/${add.body.id}`)).status).toBe(404)
    expect(
      (await h.prisma.auditLog.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(
        (a) => a.action,
      ),
    ).toEqual(['BLOCKED_WORD_ADD', 'BLOCKED_WORD_REMOVE'])
  })

  it('tulis: post dan komentar memuat kata tetap tersimpan (201) tetapi ditandai; yang bersih tidak', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    await h.as(admin).post('/admin/blocked-words').send({ word: 'judi' })
    const bad = await h
      .as(user)
      .post('/posts')
      .send({ content: 'Main JUDI yuk', privacy: 'PUBLIC' })
    const ok = await h.as(user).post('/posts').send({ content: 'halo', privacy: 'PUBLIC' })
    expect([bad.status, ok.status]).toEqual([201, 201])
    const c = await h
      .as(user)
      .post(`/posts/${ok.body.id}/comments`)
      .send({ content: 'ada judi online' })
    expect(c.status).toBe(201)
    expect((await h.prisma.post.findUniqueOrThrow({ where: { id: bad.body.id } })).flagged).toBe(
      true,
    )
    expect((await h.prisma.post.findUniqueOrThrow({ where: { id: ok.body.id } })).flagged).toBe(
      false,
    )
    expect((await h.prisma.comment.findUniqueOrThrow({ where: { id: c.body.id } })).flagged).toBe(
      true,
    )
  })

  it('menambah kata menandai konten lama; filter flagged di moderasi menampilkannya', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    const old = await h.prisma.post.create({
      data: { authorId: user.id, content: 'Beli Obat murah', privacy: 'PUBLIC' },
    })
    await h.prisma.post.create({
      data: { authorId: user.id, content: 'netral', privacy: 'PUBLIC' },
    })
    const add = await h.as(admin).post('/admin/blocked-words').send({ word: 'obat' })
    expect([add.body.flaggedPosts, add.body.flaggedComments]).toEqual([1, 0])
    const list = await h.as(admin).get('/admin/posts?filter=flagged')
    expect(list.body.items.map((p: { id: string }) => p.id)).toEqual([old.id])
  })
})
