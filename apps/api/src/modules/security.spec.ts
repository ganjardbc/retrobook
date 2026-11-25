// T-61: daftar periksa keamanan (docs/07-test-plan.md bagian 6) yang bisa diuji otomatis.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../app.module'
import { configureApp } from '../common/configure-app'
import { resetDb } from '../test/db'
import { testHelpers } from '../test/helpers'

describe('Daftar periksa keamanan (integrasi)', () => {
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

  it('header keamanan ada dan X-Powered-By tidak ada', async () => {
    const res = await request(app.getHttpServer()).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('hash password tidak pernah muncul di respons: profil, pencarian, teman, admin', async () => {
    const [admin, me, other] = await Promise.all([
      h.mkUser('admin', { role: 'ADMIN', passwordHash: '$argon2id$v=19$rahasia' }),
      h.mkUser('me', { passwordHash: '$argon2id$v=19$rahasia' }),
      h.mkUser('other', { passwordHash: '$argon2id$v=19$rahasia' }),
    ])
    await h.prisma.post.create({ data: { authorId: other.id, content: 'halo', privacy: 'PUBLIC' } })
    const paths = [
      ['me', '/users/me'],
      ['me', `/users/${other.username}`],
      ['me', '/search?q=o'],
      ['me', '/friends'],
      ['me', '/feed'],
      ['admin', '/admin/users'],
      ['admin', `/admin/users/${other.id}`],
      ['admin', '/admin/posts'],
    ] as const
    for (const [who, path] of paths) {
      const res = await h.as(who === 'admin' ? admin : me).get(path)
      expect(res.status).toBeLessThan(500)
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2|rahasia/)
    }
  })

  it("injeksi SQL: parameter q berisi ' OR 1=1 -- diperlakukan sebagai teks", async () => {
    const [admin, me] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('me')])
    const q = encodeURIComponent("' OR 1=1 --")
    const search = await h.as(me).get(`/search?q=${q}`)
    expect(search.status).toBe(200)
    expect(search.body.items ?? search.body).toEqual([])
    for (const path of [`/admin/users?q=${q}`, `/admin/posts?q=${q}`, `/admin/comments?q=${q}`]) {
      const res = await h.as(admin).get(path)
      expect(res.status).toBe(200)
      expect(res.body.items).toEqual([])
    }
  })

  it('XSS: konten berisi tag disimpan dan dikembalikan sebagai teks mentah (frontend meng-escape; v-html dilarang ESLint)', async () => {
    const me = await h.mkUser('me')
    const payload = '<script>alert(1)</script>"><img src=x onerror=alert(1)>'
    const res = await h.as(me).post('/posts').send({ content: payload, privacy: 'PUBLIC' })
    expect(res.status).toBe(201)
    expect(res.body.content).toBe(payload)
  })

  it('IDOR: mengubah atau menghapus post dan komentar milik orang lain ditolak, data tidak berubah', async () => {
    const [owner, intruder] = await Promise.all([h.mkUser('owner'), h.mkUser('intruder')])
    const post = await h.prisma.post.create({
      data: { authorId: owner.id, content: 'asli', privacy: 'PUBLIC' },
    })
    const comment = await h.prisma.comment.create({
      data: { postId: post.id, authorId: owner.id, content: 'kom' },
    })
    const results = [
      await h.as(intruder).patch(`/posts/${post.id}`).send({ content: 'diubah' }),
      await h.as(intruder).del(`/posts/${post.id}`),
      await h.as(intruder).del(`/comments/${comment.id}`),
    ]
    for (const r of results) expect([403, 404]).toContain(r.status)
    expect((await h.prisma.post.findUniqueOrThrow({ where: { id: post.id } })).content).toBe('asli')
    expect((await h.prisma.post.findUniqueOrThrow({ where: { id: post.id } })).deletedAt).toBeNull()
    expect(
      (await h.prisma.comment.findUniqueOrThrow({ where: { id: comment.id } })).deletedAt,
    ).toBeNull()
  })

  it('error tak terduga tidak membocorkan detail dan token tidak ikut respons error', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/feed')
      .set('Authorization', 'Bearer abc.def.ghi')
    expect(res.status).toBe(401)
    expect(JSON.stringify(res.body)).not.toContain('abc.def.ghi')
  })
})
