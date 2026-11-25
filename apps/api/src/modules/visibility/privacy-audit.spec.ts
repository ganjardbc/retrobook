// T-87: audit privasi endpoint Fase 3 (album, grup, event, notes, life event) terhadap blokir,
// BANNED, dan non-teman (R-03, BR-05, BR-11). Data langsung ke DB; permintaan lewat HTTP.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Audit privasi endpoint Fase 3 (integrasi)', () => {
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

  const block = (blocker: { id: number }, blocked: { id: number }) =>
    h.prisma.block.create({ data: { blockerId: blocker.id, blockedId: blocked.id } })

  describe('grup', () => {
    it('kreator berpasangan blokir: grup publik tak terlihat, tak bisa di-join, tak disarankan (dua arah)', async () => {
      const owner = await h.mkUser('owner')
      const viewer = await h.mkUser('viewer')
      const other = await h.mkUser('other')
      const group = await h.prisma.group.create({
        data: { name: 'Klub', description: '', privacy: 'PUBLIC', createdBy: owner.id },
      })
      await h.prisma.groupMember.create({
        data: { groupId: group.id, userId: owner.id, role: 'ADMIN' },
      })
      await block(owner, viewer)

      expect((await h.as(viewer).get(`/groups/${group.id}`)).status).toBe(404)
      expect((await h.as(viewer).post(`/groups/${group.id}/join`)).status).toBe(404)
      expect((await h.as(viewer).get('/groups')).body.suggested).toHaveLength(0)
      // Orang lain tetap bisa menemukannya.
      expect((await h.as(other).get('/groups')).body.suggested).toHaveLength(1)
    })

    it('anggota yang sudah ada tetap bisa membuka grupnya setelah blokir', async () => {
      const owner = await h.mkUser('owner')
      const member = await h.mkUser('member')
      const group = await h.prisma.group.create({
        data: { name: 'Klub', description: '', privacy: 'PUBLIC', createdBy: owner.id },
      })
      await h.prisma.groupMember.createMany({
        data: [
          { groupId: group.id, userId: owner.id, role: 'ADMIN' },
          { groupId: group.id, userId: member.id, role: 'MEMBER' },
        ],
      })
      await block(owner, member)
      expect((await h.as(member).get(`/groups/${group.id}`)).status).toBe(200)
    })
  })

  describe('event', () => {
    it('event dari akun BANNED atau berpasangan blokir tidak muncul di daftar maupun detail', async () => {
      const creator = await h.mkUser('creator')
      const banned = await h.mkUser('banned', { status: 'BANNED' })
      const viewer = await h.mkUser('viewer')
      const startsAt = new Date(Date.now() + 86_400_000)
      const ok = await h.prisma.event.create({
        data: { createdBy: creator.id, title: 'Terlihat', description: '', location: '', startsAt },
      })
      const hidden = await h.prisma.event.create({
        data: { createdBy: banned.id, title: 'Banned', description: '', location: '', startsAt },
      })
      expect(
        (await h.as(viewer).get('/events')).body.items.map((e: { id: number }) => e.id),
      ).toEqual([ok.id])
      expect((await h.as(viewer).get(`/events/${hidden.id}`)).status).toBe(404)
      expect(
        (await h.as(viewer).put(`/events/${hidden.id}/rsvp`).send({ status: 'GOING' })).status,
      ).toBe(404)
      await block(viewer, creator)
      expect((await h.as(viewer).get(`/events/${ok.id}`)).status).toBe(404)
    })
  })

  describe('notes dan life event di profil', () => {
    it('ONLY_ME hanya pemilik; FRIENDS hanya teman; PUBLIC semua; blokir menutup profil', async () => {
      const owner = await h.mkUser('owner')
      const friend = await h.mkUser('friend')
      const stranger = await h.mkUser('stranger')
      await h.befriend(owner, friend)
      for (const privacy of ['ONLY_ME', 'FRIENDS', 'PUBLIC'] as const) {
        await h.prisma.note.create({
          data: { authorId: owner.id, title: privacy, body: 'x', privacy },
        })
        await h.prisma.lifeEvent.create({
          data: {
            userId: owner.id,
            kind: 'OTHER',
            title: privacy,
            happenedOn: new Date('2014-05-05'),
            privacy,
          },
        })
      }
      const titles = (res: { body: unknown }) =>
        ((res.body as { items?: { title: string }[] }).items ?? (res.body as { title: string }[]))
          .map((r) => r.title)
          .sort()
      for (const path of ['notes', 'life-events']) {
        const as = async (u: { id: number }, v: Parameters<typeof h.as>[0]) =>
          titles(await h.as(v).get(`/users/${owner.username}/${path}`))
        expect(await as(owner, owner)).toEqual(['FRIENDS', 'ONLY_ME', 'PUBLIC'])
        expect(await as(friend, friend)).toEqual(['FRIENDS', 'PUBLIC'])
        expect(await as(stranger, stranger)).toEqual(['PUBLIC'])
      }
      await block(owner, stranger)
      expect((await h.as(stranger).get(`/users/${owner.username}/notes`)).status).toBe(404)
      expect((await h.as(stranger).get(`/users/${owner.username}/life-events`)).status).toBe(404)
      expect((await h.as(stranger).get(`/users/${owner.username}/albums`)).status).toBe(404)
    })

    it('note ONLY_ME milik orang lain: 404 pada GET /notes/:id', async () => {
      const owner = await h.mkUser('owner')
      const other = await h.mkUser('other')
      const note = await h.prisma.note.create({
        data: { authorId: owner.id, title: 't', body: 'b', privacy: 'ONLY_ME' },
      })
      expect((await h.as(other).get(`/notes/${note.id}`)).status).toBe(404)
      expect((await h.as(owner).get(`/notes/${note.id}`)).status).toBe(200)
    })
  })

  describe('album', () => {
    it('ONLY_ME tertutup, FRIENDS untuk teman, dan album terhapus 404', async () => {
      const owner = await h.mkUser('owner')
      const friend = await h.mkUser('friend')
      const stranger = await h.mkUser('stranger')
      await h.befriend(owner, friend)
      const mk = (privacy: 'ONLY_ME' | 'FRIENDS' | 'PUBLIC', deletedAt: Date | null = null) =>
        h.prisma.album.create({ data: { ownerId: owner.id, name: privacy, privacy, deletedAt } })
      const only = await mk('ONLY_ME')
      const friends = await mk('FRIENDS')
      const pub = await mk('PUBLIC')
      const gone = await mk('PUBLIC', new Date())
      expect((await h.as(stranger).get(`/albums/${only.id}`)).status).toBe(404)
      expect((await h.as(stranger).get(`/albums/${friends.id}`)).status).toBe(404)
      expect((await h.as(friend).get(`/albums/${friends.id}`)).status).toBe(200)
      expect((await h.as(stranger).get(`/albums/${pub.id}`)).status).toBe(200)
      expect((await h.as(friend).get(`/albums/${gone.id}`)).status).toBe(404)
      expect((await h.as(owner).get(`/albums/${only.id}`)).status).toBe(200)
    })
  })
})
