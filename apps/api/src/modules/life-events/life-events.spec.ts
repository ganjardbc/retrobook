process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Life Events (integrasi)', () => {
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

  it('mengurutkan tanggal kejadian, menerapkan privasi, dan hanya mengizinkan pemilik menghapus', async () => {
    const owner = await h.mkUser('owner')
    const friend = await h.mkUser('friend')
    const stranger = await h.mkUser('stranger')
    await h.befriend(owner, friend)
    const older = await h
      .as(owner)
      .post('/life-events')
      .send({ kind: 'GRADUATED', title: 'Lulus', happenedOn: '2018-06-01', privacy: 'FRIENDS' })
    const newer = await h
      .as(owner)
      .post('/life-events')
      .send({ kind: 'MOVED', title: 'Pindah', happenedOn: '2022-02-03', privacy: 'PUBLIC' })
    await h
      .as(owner)
      .post('/life-events')
      .send({ kind: 'OTHER', title: 'Pribadi', happenedOn: '2021-01-01', privacy: 'ONLY_ME' })
    expect(older.status).toBe(201)
    expect(newer.status).toBe(201)
    expect(
      (await h.as(friend).get(`/users/${owner.username}/life-events`)).body.items.map(
        (e: { id: number }) => e.id,
      ),
    ).toEqual([newer.body.id, older.body.id])
    expect(
      (await h.as(stranger).get(`/users/${owner.username}/life-events`)).body.items.map(
        (e: { id: number }) => e.id,
      ),
    ).toEqual([newer.body.id])
    expect((await h.as(stranger).del(`/life-events/${older.body.id}`)).status).toBe(404)
    expect((await h.as(owner).del(`/life-events/${older.body.id}`)).status).toBe(204)
  })
})
