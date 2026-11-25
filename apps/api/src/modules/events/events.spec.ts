process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

const soon = () => new Date(Date.now() + 86_400_000).toISOString()

describe('Event (integrasi)', () => {
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

  it('RSVP satu status per member; rsvpCount hanya menghitung Going', async () => {
    const a = await h.mkUser('a')
    const b = await h.mkUser('b')
    const ev = (await h.as(a).post('/events').send({ title: 'Kopdar', startsAt: soon() })).body
    await h.as(a).put(`/events/${ev.id}/rsvp`).send({ status: 'GOING' })
    await h.as(b).put(`/events/${ev.id}/rsvp`).send({ status: 'DECLINED' })
    const again = await h.as(b).put(`/events/${ev.id}/rsvp`).send({ status: 'MAYBE' })
    expect(again.body.rsvpCount).toBe(1)
    const row = (await h.as(b).get('/events')).body.items[0]
    expect([row.myRsvp, row.rsvpCount]).toEqual(['MAYBE', 1])
    expect(await h.prisma.eventRsvp.count({ where: { eventId: ev.id } })).toBe(2)
  })

  it('menolak event di masa lalu dan RSVP ke event lampau', async () => {
    const a = await h.mkUser('a')
    const past = await h
      .as(a)
      .post('/events')
      .send({ title: 'Lama', startsAt: '2001-01-01T00:00:00Z' })
    expect(past.status).toBe(400)
  })

  it('daftar dan detail event menyembunyikan pembuat yang diblokir', async () => {
    const creator = await h.mkUser('creator')
    const viewer = await h.mkUser('viewer')
    const ev = (await h.as(creator).post('/events').send({ title: 'X', startsAt: soon() })).body
    expect((await h.as(viewer).get(`/events/${ev.id}`)).status).toBe(200)
    await h.prisma.block.create({ data: { blockerId: viewer.id, blockedId: creator.id } })
    expect((await h.as(viewer).get('/events')).body.items).toEqual([])
    expect((await h.as(viewer).get(`/events/${ev.id}`)).status).toBe(404)
    expect((await h.as(viewer).put(`/events/${ev.id}/rsvp`).send({ status: 'GOING' })).status).toBe(
      404,
    )
  })

  it('kartu hari ini: ?from&to membatasi event pada rentang itu', async () => {
    const a = await h.mkUser('a')
    const t = new Date(Date.now() + 86_400_000)
    await h.as(a).post('/events').send({ title: 'Besok', startsAt: t.toISOString() })
    const from = new Date(t.getTime() - 3_600_000).toISOString()
    const to = new Date(t.getTime() + 3_600_000).toISOString()
    expect((await h.as(a).get(`/events?from=${from}&to=${to}`)).body.items).toHaveLength(1)
    const far = '2099-01-01T00:00:00.000Z'
    expect((await h.as(a).get(`/events?from=${far}&to=${far}`)).body.items).toHaveLength(0)
  })
})
