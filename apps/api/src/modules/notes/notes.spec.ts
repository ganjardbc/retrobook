process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Notes (integrasi)', () => {
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

  it('CRUD soft delete dan privasi friend/public/only-me diterapkan pada profil dan detail', async () => {
    const owner = await h.mkUser('owner')
    const friend = await h.mkUser('friend')
    const stranger = await h.mkUser('stranger')
    await h.befriend(owner, friend)
    const friendNote = await h
      .as(owner)
      .post('/notes')
      .send({ title: 'Teman', body: 'Isi teman', privacy: 'FRIENDS' })
    const publicNote = await h
      .as(owner)
      .post('/notes')
      .send({ title: 'Publik', body: 'Isi publik', privacy: 'PUBLIC' })
    const privateNote = await h
      .as(owner)
      .post('/notes')
      .send({ title: 'Pribadi', body: 'Isi pribadi', privacy: 'ONLY_ME' })
    expect([friendNote.status, publicNote.status, privateNote.status]).toEqual([201, 201, 201])
    expect(
      (await h.as(friend).get(`/users/${owner.username}/notes`)).body.items.map(
        (n: { title: string }) => n.title,
      ),
    ).toEqual(expect.arrayContaining(['Teman', 'Publik']))
    expect(
      (await h.as(stranger).get(`/users/${owner.username}/notes`)).body.items.map(
        (n: { title: string }) => n.title,
      ),
    ).toEqual(['Publik'])
    expect((await h.as(stranger).get(`/notes/${privateNote.body.id}`)).status).toBe(404)
    expect(
      (await h.as(owner).patch(`/notes/${friendNote.body.id}`).send({ title: 'Diubah' })).body
        .title,
    ).toBe('Diubah')
    expect((await h.as(owner).del(`/notes/${publicNote.body.id}`)).status).toBe(204)
    expect(
      (await h.as(owner).get('/notes')).body.items.map((n: { title: string }) => n.title),
    ).not.toContain('Publik')
  })
})
