// T-60, test plan 3.6: ADM-02, 04, 05, 06, 07, 08 (BR-07), BR-14.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Inti admin (integrasi)', () => {
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
  afterEach(() => jest.restoreAllMocks())
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })
  const token = (userId: number) =>
    h.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: `h${userId}${Math.random()}`,
        expiresAt: new Date(Date.now() + 1e7),
      },
    })

  it('ADM-02: angka dashboard sama dengan hitungan langsung di database', async () => {
    const [admin, a, b] = await Promise.all([
      h.mkUser('admin', { role: 'ADMIN' }),
      h.mkUser('a'),
      h.mkUser('b'),
    ])
    await h.mkUser('bot', { isBot: true })
    await h.mkUser('gone', { deletedAt: new Date() })
    await h.prisma.user.update({ where: { id: a.id }, data: { lastSeenAt: new Date() } })
    const p1 = await h.prisma.post.create({
      data: { authorId: a.id, content: 'x', privacy: 'PUBLIC' },
    })
    await h.prisma.post.create({
      data: { authorId: b.id, content: 'y', privacy: 'PUBLIC', deletedAt: new Date() },
    })
    await h.prisma.comment.create({ data: { postId: p1.id, authorId: b.id, content: 'c' } })
    await h.prisma.report.create({
      data: { reporterId: b.id, targetType: 'POST', targetId: p1.id, reason: 'SPAM' },
    })
    const res = await h.as(admin).get('/admin/stats')
    expect(res.body).toEqual({
      totalUsers: 3,
      totalPosts: 1,
      totalComments: 1,
      activeUsersToday: 1,
      newUsersLast7Days: 3,
      pendingReports: 1,
    })
    const series = await h.as(admin).get('/admin/stats/series?days=7')
    expect(series.body.registrationsByDay).toHaveLength(7)
    expect(series.body.registrationsByDay.at(-1).count).toBe(3)
    expect(series.body.postsByDay.at(-1).count).toBe(1)
  })

  it('ADM-04: ubah status memutus sesi, menolak login, dan menulis audit; audit gagal membatalkan perubahan', async () => {
    const [admin, user] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    await token(user.id)
    const prisma = h.prisma
    const original = prisma.$transaction.bind(prisma) as (
      fn: (tx: unknown) => unknown,
      o?: unknown,
    ) => Promise<unknown>
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementationOnce(((fn: (tx: unknown) => unknown, o?: unknown) =>
        original(
          (tx) =>
            fn(
              new Proxy(tx as object, {
                get: (t, p) =>
                  p === 'auditLog'
                    ? { create: () => Promise.reject(new Error('audit gagal')) }
                    : (t as Record<string | symbol, unknown>)[p],
              }),
            ),
          o,
        )) as never)
    const failed = await h
      .as(admin)
      .patch(`/admin/users/${user.id}/status`)
      .send({ status: 'SUSPENDED', reason: 'spam' })
    expect(failed.status).toBe(500)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe('ACTIVE')
    expect(await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(1)
    expect(await prisma.auditLog.count()).toBe(0)

    const ok = await h
      .as(admin)
      .patch(`/admin/users/${user.id}/status`)
      .send({ status: 'SUSPENDED', reason: 'spam' })
    expect([ok.status, ok.body.revokedSessions]).toEqual([200, 1])
    expect(await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(0)
    const afterToken = await h.as(user).get('/feed')
    expect([afterToken.status, afterToken.body.code]).toEqual([403, 'ACCOUNT_SUSPENDED'])
    expect((await prisma.auditLog.findMany()).map((l) => l.action)).toEqual([
      'USER_STATUS_SUSPENDED',
    ])
  })

  it('ADM-05, 06: reset password mencabut sesi dan memberi password sementara yang berfungsi; hapus = soft delete', async () => {
    const [admin, user] = await Promise.all([
      h.mkUser('admin', { role: 'ADMIN' }),
      h.mkUser('u', { email: 'u@example.com' }),
    ])
    await token(user.id)
    const reset = await h.as(admin).post(`/admin/users/${user.id}/reset-password`).send({})
    expect(reset.status).toBe(201)
    expect(reset.body.revokedSessions).toBe(1)
    const login = await (
      await import('supertest')
    )
      .default(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'u@example.com', password: reset.body.temporaryPassword })
    expect(login.status).toBe(200)
    expect((await h.as(admin).del(`/admin/users/${user.id}`)).status).toBe(200)
    expect(
      (await h.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt,
    ).not.toBeNull()
    expect((await h.as(admin).get(`/admin/users/${user.id}`)).status).toBe(404)
  })

  it('ADM-07, BR-14: admin terakhir tidak bisa dihapus, dinonaktifkan, atau diturunkan; dengan admin kedua boleh', async () => {
    const [admin, other] = await Promise.all([h.mkUser('admin', { role: 'ADMIN' }), h.mkUser('u')])
    const codes = async () =>
      [
        await h.as(admin).patch(`/admin/users/${admin.id}/role`).send({ role: 'USER' }),
        await h
          .as(admin)
          .patch(`/admin/users/${admin.id}/status`)
          .send({ status: 'SUSPENDED', reason: 'x' }),
        await h.as(admin).del(`/admin/users/${admin.id}`),
      ].map((r) => [r.status, r.body.code])
    expect(await codes()).toEqual([
      [422, 'LAST_ADMIN'],
      [422, 'LAST_ADMIN'],
      [422, 'LAST_ADMIN'],
    ])
    expect((await h.prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe('ADMIN')
    await h.prisma.user.update({ where: { id: other.id }, data: { role: 'ADMIN' } })
    expect(
      (await h.as(admin).patch(`/admin/users/${admin.id}/role`).send({ role: 'USER' })).status,
    ).toBe(200)
  })

  it('ADM-08, BR-07: post disembunyikan hilang untuk user tetapi terlihat di admin; tampilkan lagi memulihkan', async () => {
    const [admin, author, viewer] = await Promise.all([
      h.mkUser('admin', { role: 'ADMIN' }),
      h.mkUser('au'),
      h.mkUser('vw'),
    ])
    const post = await h.prisma.post.create({
      data: { authorId: author.id, content: 'rahasia', privacy: 'PUBLIC' },
    })
    expect((await h.as(viewer).get(`/posts/${post.id}`)).status).toBe(200)
    expect((await h.as(admin).patch(`/admin/posts/${post.id}`).send({ hidden: true })).status).toBe(
      200,
    )
    expect((await h.as(viewer).get(`/posts/${post.id}`)).status).toBe(404)
    const feed = await h.as(viewer).get('/feed')
    expect(JSON.stringify(feed.body)).not.toContain('rahasia')
    const adminView = await h.as(admin).get('/admin/posts')
    expect(
      adminView.body.items.map((i: { id: number; hidden: boolean }) => [i.id, i.hidden]),
    ).toEqual([[post.id, true]])
    expect(
      (await h.as(admin).patch(`/admin/posts/${post.id}`).send({ hidden: false })).status,
    ).toBe(200)
    expect((await h.as(viewer).get(`/posts/${post.id}`)).status).toBe(200)
  })
})
