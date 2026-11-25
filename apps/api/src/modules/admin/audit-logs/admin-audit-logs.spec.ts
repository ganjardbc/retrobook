// Tes integrasi audit log (T-59, ADM-14): hanya baca, bisa difilter.
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

describe('Audit log admin (integrasi)', () => {
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

  it('non-admin 403; admin melihat aksinya sendiri, filter admin/aksi/tanggal, cursor', async () => {
    const [a1, a2, user] = await Promise.all([
      h.mkUser('a1', { role: 'ADMIN' }),
      h.mkUser('a2', { role: 'ADMIN' }),
      h.mkUser('u'),
    ])
    expect((await h.as(user).get('/admin/audit-logs')).status).toBe(403)
    await h.as(a1).post('/admin/blocked-words').send({ word: 'judi' })
    await h.as(a1).post('/admin/blocked-words').send({ word: 'obat' })
    await h.as(a2).patch('/admin/settings').send({ registrationOpen: false })

    const all = await h.as(a1).get('/admin/audit-logs')
    expect(all.body.total).toBe(3)
    expect(all.body.items.map((i: { action: string }) => i.action)).toEqual([
      'SETTINGS_UPDATE',
      'BLOCKED_WORD_ADD',
      'BLOCKED_WORD_ADD',
    ])
    expect(all.body.items[0].admin.id).toBe(a2.id)
    expect((await h.as(a1).get(`/admin/audit-logs?adminId=${a1.id}`)).body.total).toBe(2)
    expect((await h.as(a1).get('/admin/audit-logs?action=SETTINGS')).body.total).toBe(1)
    const today = new Date().toISOString().slice(0, 10)
    expect((await h.as(a1).get(`/admin/audit-logs?from=${today}&to=${today}`)).body.total).toBe(3)
    expect((await h.as(a1).get('/admin/audit-logs?to=2000-01-01')).body.total).toBe(0)
    const page = await h.as(a1).get('/admin/audit-logs?limit=2')
    expect(page.body.items).toHaveLength(2)
    const next = await h.as(a1).get(`/admin/audit-logs?limit=2&cursor=${page.body.nextCursor}`)
    expect(next.body.items).toHaveLength(1)
    expect(next.body.nextCursor).toBeNull()
  })

  it('tidak ada endpoint tulis: POST, PUT, PATCH, DELETE bukan 2xx (404)', async () => {
    const admin = await h.mkUser('admin', { role: 'ADMIN' })
    await h.as(admin).post('/admin/blocked-words').send({ word: 'judi' })
    const log = await h.prisma.auditLog.findFirstOrThrow()
    for (const r of [
      h.as(admin).post('/admin/audit-logs').send({}),
      h.as(admin).put(`/admin/audit-logs/${log.id}`).send({}),
      h.as(admin).patch(`/admin/audit-logs/${log.id}`).send({ action: 'X' }),
      h.as(admin).del(`/admin/audit-logs/${log.id}`),
    ]) {
      expect((await r).status).toBe(404)
    }
    expect(await h.prisma.auditLog.count()).toBe(1)
  })
})
