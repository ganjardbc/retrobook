// T-60, ADM-01: semua rute /api/admin/* menolak non-admin (403) dan tanpa token (401).
// Rute ditemukan otomatis dari metadata controller, jadi rute admin baru ikut teruji tanpa mengubah tes ini.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication, RequestMethod } from '@nestjs/common'
import { DiscoveryModule, DiscoveryService } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'
import { IS_PUBLIC } from '../auth/public.decorator'

type AdminRoute = { method: 'get' | 'post' | 'put' | 'patch' | 'delete'; path: string }
const METHODS: Record<number, AdminRoute['method'] | undefined> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.DELETE]: 'delete',
}
const join = (...parts: string[]) => '/' + parts.map((p) => p.replace(/^\/|\/$/g, '')).filter(Boolean).join('/')

function discoverAdminRoutes(app: INestApplication): AdminRoute[] {
  const routes: AdminRoute[] = []
  for (const { metatype } of app.get(DiscoveryService).getControllers()) {
    if (!metatype) continue
    const base = String(Reflect.getMetadata('path', metatype) ?? '')
    if (!base.startsWith('admin')) continue
    for (const name of Object.getOwnPropertyNames(metatype.prototype)) {
      const handler = metatype.prototype[name]
      const method = METHODS[Reflect.getMetadata('method', handler) as number]
      if (!method || Reflect.getMetadata(IS_PUBLIC, handler)) continue
      routes.push({ method, path: join('/api', base, String(Reflect.getMetadata('path', handler) ?? '')).replace(/:\w+/g, '1') })
    }
  }
  return routes
}

describe('Semua rute admin menolak non-admin (ADM-01)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  let routes: AdminRoute[]

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule, DiscoveryModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    h = testHelpers(app)
    routes = discoverAdminRoutes(app)
  })
  beforeEach(() => resetDb(h.prisma))
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  it('menemukan rute admin dari setiap area (jaring pengaman agar tes tidak kosong)', () => {
    expect(routes.length).toBeGreaterThanOrEqual(25)
    for (const area of ['stats', 'users', 'posts', 'comments', 'reports', 'blocked-words', 'settings', 'announcements', 'audit-logs']) {
      expect(routes.some((r) => r.path.includes(`/admin/${area}`))).toBe(true)
    }
  })

  it('user biasa: 403 di semua rute; tanpa token: 401; tidak ada efek samping di audit', async () => {
    const user = await h.mkUser('biasa')
    const bad: string[] = []
    for (const { method, path } of routes) {
      const asUser = await request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${h.tokenOf(user)}`).send({})
      const anon = await request(app.getHttpServer())[method](path).send({})
      if (asUser.status !== 403) bad.push(`${method.toUpperCase()} ${path} user=${asUser.status}`)
      if (anon.status !== 401) bad.push(`${method.toUpperCase()} ${path} anon=${anon.status}`)
    }
    expect(bad).toEqual([])
    expect(await h.prisma.auditLog.count()).toBe(0)
  })
})
