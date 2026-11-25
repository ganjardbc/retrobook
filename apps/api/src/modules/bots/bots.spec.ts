// Tes integrasi bot (T-66, BOT-01, ADM-15, BR-09).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'
import { BotsService } from './bots.service'

describe('Bot AI (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  let bots: BotsService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    h = testHelpers(app)
    bots = app.get(BotsService)
  })
  beforeEach(() => resetDb(h.prisma))
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000)

  async function makeBot(admin: Awaited<ReturnType<typeof h.mkUser>>, extra: object = {}) {
    const res = await h
      .as(admin)
      .post('/admin/bots')
      .send({
        username: 'botty',
        displayName: 'Botty',
        persona: 'coffee, music',
        postsPerDay: 2,
        ...extra,
      })
    expect(res.status).toBe(201)
    return res.body.userId as number
  }

  it('admin saja: non-admin 403; membuat bot (isBot), validasi, duplikat 409, ubah, tercatat di audit', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    expect((await h.as(user).get('/admin/bots')).status).toBe(403)
    expect(
      (
        await h
          .as(admin)
          .post('/admin/bots')
          .send({ username: 'x', displayName: 'X', persona: 'p' })
      ).status,
    ).toBe(400)
    const id = await makeBot(admin)
    expect((await h.prisma.user.findUniqueOrThrow({ where: { id } })).isBot).toBe(true)
    expect(
      (
        await h
          .as(admin)
          .post('/admin/bots')
          .send({ username: 'botty', displayName: 'B', persona: 'p' })
      ).status,
    ).toBe(409)
    const upd = await h.as(admin).patch(`/admin/bots/${id}`).send({ active: false, postsPerDay: 4 })
    expect([upd.body.active, upd.body.postsPerDay]).toEqual([false, 4])
    expect((await h.as(admin).patch('/admin/bots/999999').send({ active: true })).status).toBe(404)
    expect((await h.prisma.auditLog.findMany()).map((a) => a.action)).toEqual([
      'BOT_CREATE',
      'BOT_UPDATE',
    ])
  })

  it('BR-09: bot tidak bisa login dan tidak dihitung sebagai user di statistik', async () => {
    const admin = await h.mkUser('admin', { role: 'ADMIN' })
    await makeBot(admin)
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'botty', password: 'apa-saja-123' })
    expect([login.status, login.body.code]).toEqual([401, 'INVALID_CREDENTIALS'])
    expect((await h.as(admin).get('/admin/stats')).body.totalUsers).toBe(1)
  })

  it('tick: menerima permintaan pertemanan, memposting sesuai frekuensi, membalas komentar baru sekali', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    const botId = await makeBot(admin)
    await h.prisma.friendship.create({
      data: {
        requesterId: user.id,
        addresseeId: botId,
        pairLowId: Math.min(user.id, botId),
        pairHighId: Math.max(user.id, botId),
        status: 'PENDING',
      },
    })

    // Belum jatuh tempo (postsPerDay 2 = tiap 12 jam): hanya menerima pertemanan.
    expect(await bots.tick()).toEqual({ posts: 0, replies: 0, accepted: 1 })
    expect(
      (await h.prisma.friendship.findFirstOrThrow({ where: { addresseeId: botId } })).status,
    ).toBe('ACCEPTED')

    const due = await bots.tick(hours(13))
    expect(due.posts).toBe(1)
    const post = await h.prisma.post.findFirstOrThrow({ where: { authorId: botId } })
    expect(post.privacy).toBe('PUBLIC')
    expect(post.content).toMatch(/coffee|music|#/)
    expect(await bots.tick(hours(14))).toMatchObject({ posts: 0 })

    const comment = await h.prisma.comment.create({
      data: { postId: post.id, authorId: user.id, content: 'halo bot', createdAt: hours(14.5) },
    })
    expect((await bots.tick(hours(15))).replies).toBe(1)
    const replies = await h.prisma.comment.findMany({ where: { postId: post.id, authorId: botId } })
    expect(replies).toHaveLength(1)
    expect(replies[0]!.id).toBeGreaterThan(comment.id)
    expect((await bots.tick(hours(16))).replies).toBe(0) // tidak membalas ulang
    expect(
      await h.prisma.notification.count({
        where: { userId: user.id, type: 'COMMENT', actorId: botId },
      }),
    ).toBe(1)
  })

  it('bot nonaktif tidak melakukan apa pun', async () => {
    const admin = await h.mkUser('admin', { role: 'ADMIN' })
    const botId = await makeBot(admin)
    await h.as(admin).patch(`/admin/bots/${botId}`).send({ active: false })
    expect(await bots.tick(hours(48))).toEqual({ posts: 0, replies: 0, accepted: 0 })
    expect(await h.prisma.post.count({ where: { authorId: botId } })).toBe(0)
  })
})
