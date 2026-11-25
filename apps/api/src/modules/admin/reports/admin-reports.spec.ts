// Tes integrasi antrean laporan admin (T-55, ADM-10): keputusan sekali panggil + audit satu transaksi.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../../app.module'
import { configureApp } from '../../../common/configure-app'
import { resetDb } from '../../../test/db'
import { testHelpers } from '../../../test/helpers'

describe('Antrean laporan admin (integrasi)', () => {
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

  async function setup() {
    const [admin, reporter, author] = await Promise.all([
      h.mkUser('admin', { role: 'ADMIN' }),
      h.mkUser('rep'),
      h.mkUser('auth'),
    ])
    const post = await h.prisma.post.create({
      data: { authorId: author.id, content: 'spam', privacy: 'PUBLIC' },
    })
    const report = await h.prisma.report.create({
      data: { reporterId: reporter.id, targetType: 'POST', targetId: post.id, reason: 'SPAM' },
    })
    return { admin, reporter, author, post, report }
  }
  const audits = () =>
    h.prisma.auditLog.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })

  it('non-admin: 403; daftar memuat pratinjau target', async () => {
    const { admin, reporter, report } = await setup()
    expect((await h.as(reporter).get('/admin/reports')).status).toBe(403)
    expect(
      (await h.as(reporter).patch(`/admin/reports/${report.id}`).send({ status: 'DISMISSED' }))
        .status,
    ).toBe(403)
    const res = await h.as(admin).get('/admin/reports?status=PENDING')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.items[0].target.content).toBe('spam')
  })

  it('HIDE_CONTENT: satu panggilan menyembunyikan post, menutup laporan, dan mencatat audit', async () => {
    const { admin, post, report } = await setup()
    const res = await h
      .as(admin)
      .patch(`/admin/reports/${report.id}`)
      .send({ status: 'REVIEWED', action: 'HIDE_CONTENT', note: ' spam ' })
    expect(res.status).toBe(200)
    expect((await h.prisma.post.findUniqueOrThrow({ where: { id: post.id } })).hidden).toBe(true)
    expect(await h.prisma.report.findUniqueOrThrow({ where: { id: report.id } })).toMatchObject({
      status: 'REVIEWED',
      handledBy: admin.id,
    })
    const log = await audits()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({
      action: 'REPORT_REVIEWED_HIDE_CONTENT',
      targetType: 'REPORT',
      targetId: report.id,
    })
  })

  it('DELETE_CONTENT dan SUSPEND_USER: hapus lunak; skors mencabut sesi', async () => {
    const { admin, author, post, report } = await setup()
    await h.prisma.refreshToken.create({
      data: { userId: author.id, tokenHash: 'h', expiresAt: new Date(Date.now() + 1e6) },
    })
    expect(
      (
        await h
          .as(admin)
          .patch(`/admin/reports/${report.id}`)
          .send({ status: 'REVIEWED', action: 'DELETE_CONTENT' })
      ).status,
    ).toBe(200)
    expect(
      (await h.prisma.post.findUniqueOrThrow({ where: { id: post.id } })).deletedAt,
    ).not.toBeNull()
    const r2 = await h.prisma.report.create({
      data: { reporterId: admin.id, targetType: 'USER', targetId: author.id, reason: 'OTHER' },
    })
    expect(
      (
        await h
          .as(admin)
          .patch(`/admin/reports/${r2.id}`)
          .send({ status: 'REVIEWED', action: 'SUSPEND_USER' })
      ).status,
    ).toBe(200)
    expect((await h.prisma.user.findUniqueOrThrow({ where: { id: author.id } })).status).toBe(
      'SUSPENDED',
    )
    expect(
      await h.prisma.refreshToken.count({ where: { userId: author.id, revokedAt: null } }),
    ).toBe(0)
  })

  it('DISMISSED tanpa aksi; ulang 409; DISMISSED+aksi 422; aksi konten pada profil 422 tanpa efek', async () => {
    const { admin, author, post, report } = await setup()
    expect(
      (
        await h
          .as(admin)
          .patch(`/admin/reports/${report.id}`)
          .send({ status: 'DISMISSED', action: 'HIDE_CONTENT' })
      ).status,
    ).toBe(422)
    expect(
      (await h.as(admin).patch(`/admin/reports/${report.id}`).send({ status: 'DISMISSED' })).status,
    ).toBe(200)
    expect((await h.prisma.post.findUniqueOrThrow({ where: { id: post.id } })).hidden).toBe(false)
    const again = await h
      .as(admin)
      .patch(`/admin/reports/${report.id}`)
      .send({ status: 'DISMISSED' })
    expect([again.status, again.body.code]).toEqual([409, 'ALREADY_HANDLED'])
    const r2 = await h.prisma.report.create({
      data: { reporterId: admin.id, targetType: 'USER', targetId: author.id, reason: 'OTHER' },
    })
    expect(
      (
        await h
          .as(admin)
          .patch(`/admin/reports/${r2.id}`)
          .send({ status: 'REVIEWED', action: 'DELETE_CONTENT' })
      ).status,
    ).toBe(422)
    expect((await h.prisma.report.findUniqueOrThrow({ where: { id: r2.id } })).status).toBe(
      'PENDING',
    )
    expect(await audits()).toHaveLength(1)
  })
})
