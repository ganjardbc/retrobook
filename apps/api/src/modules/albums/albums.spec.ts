process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Album (integrasi)', () => {
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

  const mk = (owner: Parameters<typeof h.as>[0], privacy: string) =>
    h
      .as(owner)
      .post('/albums')
      .send({ name: `a-${privacy}`, privacy })

  it('menerapkan privasi album dan menjawab 404 yang sama', async () => {
    const owner = await h.mkUser('owner')
    const friend = await h.mkUser('friend')
    const stranger = await h.mkUser('stranger')
    await h.befriend(owner, friend)
    const pub = (await mk(owner, 'PUBLIC')).body
    const fr = (await mk(owner, 'FRIENDS')).body
    const me = (await mk(owner, 'ONLY_ME')).body
    const status = async (u: typeof owner, id: string) =>
      (await h.as(u).get(`/albums/${id}`)).status
    expect([
      await status(stranger, pub.id),
      await status(stranger, fr.id),
      await status(stranger, me.id),
    ]).toEqual([200, 404, 404])
    expect([
      await status(friend, pub.id),
      await status(friend, fr.id),
      await status(friend, me.id),
    ]).toEqual([200, 200, 404])
    expect([
      await status(owner, pub.id),
      await status(owner, fr.id),
      await status(owner, me.id),
    ]).toEqual([200, 200, 200])
    const names = async (u: typeof owner) =>
      (await h.as(u).get(`/users/${owner.username}/albums`)).body.map((a: { id: string }) => a.id)
    expect(await names(stranger)).toEqual([pub.id])
    expect((await names(friend)).sort()).toEqual([pub.id, fr.id].sort())
  })

  it('blokir dua arah menyembunyikan album dan profil pemiliknya', async () => {
    const owner = await h.mkUser('owner')
    const blocked = await h.mkUser('blocked')
    const album = (await mk(owner, 'PUBLIC')).body
    await h.prisma.block.create({ data: { blockerId: owner.id, blockedId: blocked.id } })
    expect((await h.as(blocked).get(`/albums/${album.id}`)).status).toBe(404)
    expect((await h.as(blocked).get(`/users/${owner.username}/albums`)).status).toBe(404)
  })

  it('IDOR: hanya pemilik yang bisa mengunggah foto ke album', async () => {
    const owner = await h.mkUser('owner')
    const other = await h.mkUser('other')
    const album = (await mk(owner, 'PUBLIC')).body
    const res = await h
      .as(other)
      .post(`/albums/${album.id}/photos`)
      .attach('files', Buffer.from('x'), 'a.png')
    expect(res.status).toBe(404)
  })

  it('hanya pemilik yang bisa menghapus album dan foto; album terhapus hilang untuk semua', async () => {
    const owner = await h.mkUser('owner')
    const other = await h.mkUser('other')
    const album = (await mk(owner, 'PUBLIC')).body
    const photo = await h.prisma.photo.create({
      data: { albumId: album.id, ownerId: owner.id, url: '/uploads/x.png', caption: '' },
    })
    expect((await h.as(other).del(`/albums/${album.id}/photos/${photo.id}`)).status).toBe(404)
    expect((await h.as(other).del(`/albums/${album.id}`)).status).toBe(404)
    expect((await h.as(owner).del(`/albums/${album.id}/photos/${photo.id}`)).status).toBe(204)
    expect(await h.prisma.photo.count({ where: { albumId: album.id } })).toBe(0)
    expect((await h.as(owner).del(`/albums/${album.id}`)).status).toBe(204)
    expect((await h.as(owner).get(`/albums/${album.id}`)).status).toBe(404)
    expect((await h.as(owner).get('/albums')).body).toEqual([])
    expect((await h.as(owner).del(`/albums/${album.id}`)).status).toBe(404)
  })
})
