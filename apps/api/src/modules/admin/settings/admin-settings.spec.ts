// Tes integrasi pengaturan sistem (T-57, ADM-12, BR-12).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../../app.module'
import { configureApp } from '../../../common/configure-app'
import { resetDb } from '../../../test/db'
import { testHelpers } from '../../../test/helpers'

describe('Pengaturan sistem (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  const http = () => request(app.getHttpServer())

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

  it('bawaan: pendaftaran terbuka, tidak maintenance; publik tanpa token; PATCH hanya admin dan tercatat', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    expect((await http().get('/api/settings/public')).body).toEqual({ maintenanceMode: false, registrationOpen: true })
    expect((await h.as(user).patch('/admin/settings').send({ maintenanceMode: true })).status).toBe(403)
    expect((await h.as(admin).patch('/admin/settings').send({})).status).toBe(400)
    expect((await h.as(admin).patch('/admin/settings').send({ maintenanceMode: 'ya' })).status).toBe(400)
    const res = await h.as(admin).patch('/admin/settings').send({ registrationOpen: false })
    expect(res.body).toEqual({ maintenanceMode: false, registrationOpen: false })
    expect((await h.prisma.auditLog.findMany()).map((a) => a.action)).toEqual(['SETTINGS_UPDATE'])
  })

  it('pendaftaran ditutup: register 403 REGISTRATION_CLOSED; dibuka lagi berlaku langsung', async () => {
    const admin = await h.mkUser('admin', { role: 'ADMIN' })
    const body = { email: 'baru@example.com', username: 'baru_01', displayName: 'Baru', password: 'password-123' }
    await h.as(admin).patch('/admin/settings').send({ registrationOpen: false })
    const closed = await http().post('/api/auth/register').send(body)
    expect([closed.status, closed.body.code]).toEqual([403, 'REGISTRATION_CLOSED'])
    await h.as(admin).patch('/admin/settings').send({ registrationOpen: true })
    expect((await http().post('/api/auth/register').send(body)).status).toBe(201)
  })

  it('maintenance: non-admin 403 MAINTENANCE_MODE di API, login, dan refresh; admin tetap masuk; publik tetap terbuka', async () => {
    const argon2 = await import('argon2')
    const passwordHash = await argon2.hash('password-123')
    const [admin, user] = await Promise.all([
      h.mkUser('admin', { role: 'ADMIN', passwordHash }),
      h.mkUser('u', { passwordHash }),
    ])
    const login = await http().post('/api/auth/login').send({ identifier: user.username, password: 'password-123' })
    expect(login.status).toBe(200)
    await h.as(admin).patch('/admin/settings').send({ maintenanceMode: true })

    const api = await h.as(user).get('/feed')
    expect([api.status, api.body.code]).toEqual([403, 'MAINTENANCE_MODE'])
    const again = await http().post('/api/auth/login').send({ identifier: user.username, password: 'password-123' })
    expect([again.status, again.body.code]).toEqual([403, 'MAINTENANCE_MODE'])
    const refresh = await http().post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken })
    expect([refresh.status, refresh.body.code]).toEqual([403, 'MAINTENANCE_MODE'])
    expect((await http().get('/api/settings/public')).body.maintenanceMode).toBe(true)

    expect((await http().post('/api/auth/login').send({ identifier: admin.username, password: 'password-123' })).status).toBe(200)
    expect((await http().post('/api/admin/auth/login').send({ identifier: admin.username, password: 'password-123' })).status).toBe(200)
    expect((await h.as(admin).get('/admin/settings')).status).toBe(200)

    await h.as(admin).patch('/admin/settings').send({ maintenanceMode: false })
    expect((await h.as(user).get('/feed')).status).toBe(200)
  })
})
