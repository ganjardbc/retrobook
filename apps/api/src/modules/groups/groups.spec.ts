process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Grup (integrasi)', () => {
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

  it('anggota non-teman membaca post grup; non-anggota mendapat 404', async () => {
    const admin = await h.mkUser('admin')
    const member = await h.mkUser('member')
    const outsider = await h.mkUser('outsider')
    const group = (await h.as(admin).post('/groups').send({ name: 'Klub', privacy: 'PUBLIC' })).body
    expect((await h.as(member).post(`/groups/${group.id}/join`)).status).toBe(201)
    const post = await h.as(admin).post(`/groups/${group.id}/posts`).send({ content: 'halo grup' })
    expect(post.status).toBe(201)
    const seen = await h.as(member).get(`/groups/${group.id}/posts`)
    expect(seen.body.items.map((p: { id: number }) => p.id)).toEqual([post.body.id])
    expect((await h.as(outsider).get(`/groups/${group.id}/posts`)).status).toBe(404)
    expect(
      (await h.as(outsider).post(`/groups/${group.id}/posts`).send({ content: 'x' })).status,
    ).toBe(404)
  })

  it('grup CLOSED tidak bisa dimasuki sendiri dan tidak bocor lewat join', async () => {
    const admin = await h.mkUser('admin')
    const stranger = await h.mkUser('stranger')
    const group = (await h.as(admin).post('/groups').send({ name: 'Rahasia', privacy: 'CLOSED' }))
      .body
    expect((await h.as(stranger).post(`/groups/${group.id}/join`)).status).toBe(404)
    expect((await h.as(stranger).get(`/groups/${group.id}`)).status).toBe(404)
    expect((await h.as(stranger).get('/groups')).body.suggested).toEqual([])
    expect((await h.as(admin).get(`/groups/${group.id}`)).status).toBe(200)
  })

  it('admin terakhir tidak bisa keluar selama masih ada anggota lain', async () => {
    const admin = await h.mkUser('admin')
    const member = await h.mkUser('member')
    const group = (await h.as(admin).post('/groups').send({ name: 'Klub', privacy: 'PUBLIC' })).body
    await h.as(member).post(`/groups/${group.id}/join`)
    const res = await h.as(admin).post(`/groups/${group.id}/leave`)
    expect(res.status).toBe(409)
    expect((await h.as(member).post(`/groups/${group.id}/leave`)).status).toBe(201)
  })

  it('POST /posts dengan groupId: anggota boleh (dengan perasaan), non-anggota 404, tag ditolak', async () => {
    const admin = await h.mkUser('admin')
    const outsider = await h.mkUser('outsider')
    const friend = await h.mkUser('friend')
    const group = (await h.as(admin).post('/groups').send({ name: 'Klub', privacy: 'PUBLIC' })).body
    const ok = await h
      .as(admin)
      .post('/posts')
      .send({ content: 'hai', groupId: group.id, privacy: 'FRIENDS', feeling: 'feeling happy' })
    expect(ok.status).toBe(201)
    expect(ok.body.groupId).toBe(group.id)
    expect(
      (await h.as(outsider).post('/posts').send({ content: 'x', groupId: group.id })).status,
    ).toBe(404)
    const tagged = await h
      .as(admin)
      .post('/posts')
      .send({ content: 'x', groupId: group.id, taggedUserIds: [friend.id] })
    expect(tagged.status).toBe(400)
  })
})
