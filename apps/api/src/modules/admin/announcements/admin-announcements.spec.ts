// Tes integrasi pengumuman (T-58, ADM-13).
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

describe('Pengumuman (integrasi)', () => {
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

  const setup = async () => {
    const [admin, a, b, banned, bot] = await Promise.all([
      h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('a'), h.mkUser('b'),
      h.mkUser('banned', { status: 'BANNED' }), h.mkUser('bot', { isBot: true }),
    ])
    return { admin, a, b, banned, bot }
  }

  it('non-admin 403; validasi 400; membuat: notifikasi hanya ke user aktif non-bot, tercatat di audit', async () => {
    const { admin, a, b, banned, bot } = await setup()
    expect((await h.as(a).post('/admin/announcements').send({ title: 'x', body: 'y' })).status).toBe(403)
    expect((await h.as(admin).post('/admin/announcements').send({ title: '  ', body: 'y' })).status).toBe(400)
    const res = await h.as(admin).post('/admin/announcements').send({ title: ' Selamat datang ', body: 'Halo semua' })
    expect([res.status, res.body.title, res.body.active]).toEqual([201, 'Selamat datang', true])
    const recipients = (await h.prisma.notification.findMany({ where: { announcementId: res.body.id } })).map((n) => n.userId).sort()
    expect(recipients).toEqual([admin.id, a.id, b.id].sort())
    expect(recipients).not.toContain(banned.id)
    expect(recipients).not.toContain(bot.id)
    expect((await h.prisma.auditLog.findMany()).map((l) => l.action)).toEqual(['ANNOUNCEMENT_CREATE'])
  })

  it('user melihat notifikasi ANNOUNCEMENT dengan judul dan banner aktif; nonaktif menghilangkan keduanya', async () => {
    const { admin, a } = await setup()
    const created = await h.as(admin).post('/admin/announcements').send({ title: 'Maintenance Jumat', body: 'detail' })
    const list = await h.as(a).get('/notifications')
    expect(list.body.items[0]).toMatchObject({ type: 'ANNOUNCEMENT', text: 'Maintenance Jumat', actor: null })
    expect((await h.as(a).get('/announcements/active')).body.items.map((i: { id: number }) => i.id)).toEqual([created.body.id])
    expect((await h.as(admin).patch(`/admin/announcements/${created.body.id}`).send({ active: false })).body.active).toBe(false)
    expect((await h.as(a).get('/announcements/active')).body.items).toEqual([])
    expect((await h.as(a).get('/notifications')).body.items).toEqual([])
    expect((await h.as(a).get('/notifications/unread-count')).body.count).toBe(0)
  })

  it('hapus menghapus notifikasinya; id tidak ada 404; semua aksi tulis tercatat', async () => {
    const { admin, a } = await setup()
    const { body } = await h.as(admin).post('/admin/announcements').send({ title: 't', body: 'b' })
    expect((await h.as(admin).patch(`/admin/announcements/${body.id}`).send({ title: 'baru' })).body.title).toBe('baru')
    expect((await h.as(admin).del(`/admin/announcements/${body.id}`)).status).toBe(200)
    expect(await h.prisma.notification.count({ where: { userId: a.id } })).toBe(0)
    expect((await h.as(admin).del(`/admin/announcements/${body.id}`)).status).toBe(404)
    expect((await h.as(admin).patch('/admin/announcements/999999').send({ active: false })).status).toBe(404)
    expect((await h.prisma.auditLog.findMany()).map((l) => l.action)).toEqual(['ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_UPDATE', 'ANNOUNCEMENT_DELETE'])
  })
})
