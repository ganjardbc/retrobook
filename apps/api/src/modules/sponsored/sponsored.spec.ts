// Tes integrasi Sponsored dan kelola trending (T-69, SPN-01, ADM-16, ADM-17).
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
import { testHelpers, MISSING_ID } from '../../test/helpers'

describe('Sponsored dan kelola trending (integrasi)', () => {
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
  const valid = { title: 'Promo', body: 'Diskon besar', linkUrl: 'https://example.com/promo' }
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

  it('admin saja; validasi tautan (javascript: ditolak), jendela waktu, tercatat di audit', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    expect((await h.as(user).post('/admin/sponsored').send(valid)).status).toBe(403)
    for (const bad of [
      { linkUrl: 'javascript:alert(1)' },
      { linkUrl: 'data:text/html,x' },
      { imageUrl: 'javascript:x' },
      { title: '' },
      { startsAt: day(2), endsAt: day(1) },
    ]) {
      expect(
        (
          await h
            .as(admin)
            .post('/admin/sponsored')
            .send({ ...valid, ...bad })
        ).status,
      ).toBe(400)
    }
    const ok = await h
      .as(admin)
      .post('/admin/sponsored')
      .send({ ...valid, linkUrl: '/hashtag/promo' })
    expect([ok.status, ok.body.active]).toEqual([201, true])
    expect(
      (
        await h
          .as(admin)
          .patch(`/admin/sponsored/${ok.body.id}`)
          .send({ startsAt: day(3), endsAt: day(1) })
      ).status,
    ).toBe(400)
    expect((await h.as(admin).del(`/admin/sponsored/${ok.body.id}`)).status).toBe(200)
    expect((await h.as(admin).del(`/admin/sponsored/${ok.body.id}`)).status).toBe(404)
    expect(
      (await h.prisma.auditLog.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(
        (a) => a.action,
      ),
    ).toEqual(['SPONSORED_CREATE', 'SPONSORED_DELETE'])
  })

  it('GET /sponsored: perlu login; hanya yang aktif dan dalam jadwal; terbaru dulu; null bila tidak ada', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    expect((await request(app.getHttpServer()).get('/api/sponsored')).status).toBe(401)
    expect((await h.as(user).get('/sponsored')).body).toEqual({ item: null })
    const post = (extra: object) =>
      h
        .as(admin)
        .post('/admin/sponsored')
        .send({ ...valid, ...extra })
    await post({ title: 'Nonaktif', active: false })
    await post({ title: 'Belum mulai', startsAt: day(1) })
    await post({ title: 'Sudah lewat', startsAt: day(-3), endsAt: day(-1) })
    expect((await h.as(user).get('/sponsored')).body.item).toBeNull()
    await post({ title: 'Lama', startsAt: day(-1) })
    const latest = await post({ title: 'Terbaru', endsAt: day(1) })
    const res = await h.as(user).get('/sponsored')
    expect(res.body.item).toMatchObject({ id: latest.body.id, title: 'Terbaru' })
    expect(Object.keys(res.body.item).sort()).toEqual([
      'body',
      'id',
      'imageUrl',
      'linkUrl',
      'title',
    ])
    await h.as(admin).patch(`/admin/sponsored/${latest.body.id}`).send({ active: false })
    expect((await h.as(user).get('/sponsored')).body.item.title).toBe('Lama')
  })

  it('ADM-17: sembunyikan hashtag dari trending dan tampilkan lagi; non-admin 403; 404; audit', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    await h.as(user).post('/posts').send({ content: 'halo #rahasia dan #umum', privacy: 'PUBLIC' })
    const names = async () =>
      (await h.as(user).get('/trending')).body.items.map((i: { tag: string }) => i.tag).sort()
    expect(await names()).toEqual(['rahasia', 'umum'])
    expect((await h.as(user).get('/admin/hashtags')).status).toBe(403)
    const list = await h.as(admin).get('/admin/hashtags?q=%23Rahasia')
    expect(list.body.items).toHaveLength(1)
    expect(list.body.items[0]).toMatchObject({ tag: 'rahasia', hidden: false, uses: 1 })
    const id = list.body.items[0].id
    expect((await h.as(admin).patch(`/admin/hashtags/${id}`).send({ hidden: true })).body).toEqual({
      id,
      hidden: true,
    })
    expect(await names()).toEqual(['umum'])
    await h.as(admin).patch(`/admin/hashtags/${id}`).send({ hidden: false })
    expect(await names()).toEqual(['rahasia', 'umum'])
    expect(
      (await h.as(admin).patch(`/admin/hashtags/${MISSING_ID}`).send({ hidden: true })).status,
    ).toBe(404)
    expect(
      (await h.prisma.auditLog.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(
        (a) => a.action,
      ),
    ).toEqual(['HASHTAG_HIDE', 'HASHTAG_SHOW'])
  })
})
