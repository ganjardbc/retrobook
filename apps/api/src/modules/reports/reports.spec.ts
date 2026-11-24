// Tes integrasi laporan konten (T-45, INT-04, BR-02, 03, 05, 07, 11, R-03).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { User } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Laporan konten (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    h = testHelpers(app)
  })
  beforeEach(async () => {
    await resetDb(h.prisma)
  })
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  const send = (u: User, body: Record<string, unknown>) => h.as(u).post('/reports').send(body)
  const count = () => h.prisma.report.count()
  const mkPost = (author: User, extra: object = {}) =>
    h.prisma.post.create({
      data: { authorId: author.id, content: 'isi', privacy: 'PUBLIC', ...extra },
    })
  const mkComment = (postId: number, author: User, extra: object = {}) =>
    h.prisma.comment.create({ data: { postId, authorId: author.id, content: 'kom', ...extra } })

  it('tanpa token: 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reports')
      .send({ targetType: 'USER', targetId: 1, reason: 'SPAM' })
    expect(res.status).toBe(401)
  })

  describe('membuat laporan', () => {
    it('post, komentar, dan profil: 201 dengan tanda terima, tersimpan PENDING, catatan dirapikan', async () => {
      const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
      const post = await mkPost(other)
      const comment = await mkComment(post.id, other)
      const a = await send(me, {
        targetType: 'POST',
        targetId: post.id,
        reason: 'SPAM',
        note: '  iklan judi  ',
      })
      expect(a.status).toBe(201)
      expect(a.body).toEqual({
        id: expect.any(Number),
        targetType: 'POST',
        targetId: post.id,
        reason: 'SPAM',
        createdAt: expect.any(String),
      })
      expect(
        (await send(me, { targetType: 'COMMENT', targetId: comment.id, reason: 'HARASSMENT' }))
          .status,
      ).toBe(201)
      expect(
        (await send(me, { targetType: 'USER', targetId: other.id, reason: 'OTHER' })).status,
      ).toBe(201)
      const rows = await h.prisma.report.findMany({ orderBy: { id: 'asc' } })
      expect(rows.map((r) => [r.targetType, r.status, r.reporterId, r.note])).toEqual([
        ['POST', 'PENDING', me.id, 'iklan judi'],
        ['COMMENT', 'PENDING', me.id, null],
        ['USER', 'PENDING', me.id, null],
      ])
    })

    it('mengulang untuk target yang sama: 409 ALREADY_REPORTED, tidak ada baris baru; pelapor atau target lain tetap boleh', async () => {
      const [me, other, third] = await Promise.all(['me', 'other', 'third'].map((n) => h.mkUser(n)))
      const post = await mkPost(other!)
      const post2 = await mkPost(other!)
      const body = { targetType: 'POST', targetId: post.id, reason: 'SPAM' }
      expect((await send(me!, body)).status).toBe(201)
      const again = await send(me!, { ...body, reason: 'OTHER' })
      expect(again.status).toBe(409)
      expect(again.body).toMatchObject({ statusCode: 409, code: 'ALREADY_REPORTED' })
      expect(await count()).toBe(1)
      expect((await send(third!, body)).status).toBe(201)
      expect((await send(me!, { ...body, targetId: post2.id })).status).toBe(201)
    })

    it('mengulang bersamaan: tepat satu yang lolos', async () => {
      const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
      const post = await mkPost(other)
      const body = { targetType: 'POST', targetId: post.id, reason: 'SPAM' }
      const res = await Promise.all([send(me, body), send(me, body), send(me, body)])
      expect(res.map((r) => r.status).sort()).toEqual([201, 409, 409])
      expect(await count()).toBe(1)
    })

    it('laporan masuk hitungan pendingReports di admin', async () => {
      const [me, other, admin] = await Promise.all([
        h.mkUser('me'),
        h.mkUser('other'),
        h.mkUser('admin', { role: 'ADMIN' }),
      ])
      const stats = async () => (await h.as(admin).get('/admin/stats')).body.pendingReports
      expect(await stats()).toBe(0)
      await send(me, { targetType: 'USER', targetId: other.id, reason: 'SPAM' })
      expect(await stats()).toBe(1)
    })
  })

  describe('diri sendiri', () => {
    it('post, komentar, dan profil sendiri: 422 SELF_ACTION_NOT_ALLOWED, tidak ada baris', async () => {
      const me = await h.mkUser('me')
      const post = await mkPost(me)
      const comment = await mkComment(post.id, me)
      for (const [targetType, targetId] of [
        ['POST', post.id],
        ['COMMENT', comment.id],
        ['USER', me.id],
      ] as const) {
        const res = await send(me, { targetType, targetId, reason: 'SPAM' })
        expect(res.status).toBe(422)
        expect(res.body.code).toBe('SELF_ACTION_NOT_ALLOWED')
      }
      expect(await count()).toBe(0)
    })
  })

  describe('target yang tidak terlihat: 404 yang sama dengan target tidak ada, tidak ada baris (R-03)', () => {
    const cases: [string, (ctx: { me: User; other: User }) => Promise<[string, number]>][] = [
      [
        'post ONLY_ME milik orang lain',
        async ({ other }) => ['POST', (await mkPost(other, { privacy: 'ONLY_ME' })).id],
      ],
      [
        'post FRIENDS dari non-teman',
        async ({ other }) => ['POST', (await mkPost(other, { privacy: 'FRIENDS' })).id],
      ],
      ['post hidden', async ({ other }) => ['POST', (await mkPost(other, { hidden: true })).id]],
      [
        'post terhapus',
        async ({ other }) => ['POST', (await mkPost(other, { deletedAt: new Date() })).id],
      ],
      [
        'post dari penulis BANNED',
        async ({ other }) => {
          const p = await mkPost(other)
          await h.prisma.user.update({ where: { id: other.id }, data: { status: 'BANNED' } })
          return ['POST', p.id]
        },
      ],
      [
        'post dari pasangan blokir',
        async ({ me, other }) => {
          const p = await mkPost(other)
          await h.prisma.block.create({ data: { blockerId: other.id, blockedId: me.id } })
          return ['POST', p.id]
        },
      ],
      [
        'komentar di post yang tidak terlihat',
        async ({ other }) => {
          const p = await mkPost(other, { privacy: 'ONLY_ME' })
          return ['COMMENT', (await mkComment(p.id, other)).id]
        },
      ],
      [
        'komentar hidden',
        async ({ other }) => {
          const p = await mkPost(other)
          return ['COMMENT', (await mkComment(p.id, other, { hidden: true })).id]
        },
      ],
      [
        'komentar terhapus',
        async ({ other }) => {
          const p = await mkPost(other)
          return ['COMMENT', (await mkComment(p.id, other, { deletedAt: new Date() })).id]
        },
      ],
      [
        'profil BANNED',
        async ({ other }) => {
          await h.prisma.user.update({ where: { id: other.id }, data: { status: 'BANNED' } })
          return ['USER', other.id]
        },
      ],
      [
        'profil terhapus',
        async ({ other }) => {
          await h.prisma.user.update({ where: { id: other.id }, data: { deletedAt: new Date() } })
          return ['USER', other.id]
        },
      ],
      [
        'profil pasangan blokir',
        async ({ me, other }) => {
          await h.prisma.block.create({ data: { blockerId: me.id, blockedId: other.id } })
          return ['USER', other.id]
        },
      ],
      ['id yang tidak ada', async () => ['POST', 999999]],
    ]
    it.each(cases)('%s', async (_name, setup) => {
      const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
      const [targetType, targetId] = await setup({ me, other })
      const res = await send(me, { targetType, targetId, reason: 'SPAM' })
      expect(res.status).toBe(404)
      const missing = await send(me, { targetType, targetId: 999998, reason: 'SPAM' })
      expect(res.body).toEqual(missing.body)
      expect(await count()).toBe(0)
    })

    it('teman bisa melaporkan post FRIENDS temannya', async () => {
      const [me, other] = await Promise.all([h.mkUser('me'), h.mkUser('other')])
      await h.befriend(me, other)
      const p = await mkPost(other, { privacy: 'FRIENDS' })
      expect((await send(me, { targetType: 'POST', targetId: p.id, reason: 'SPAM' })).status).toBe(
        201,
      )
    })
  })

  describe('validasi', () => {
    it('400 untuk targetType/reason tidak dikenal, targetId bukan bilangan positif, catatan >500, field asing', async () => {
      const me = await h.mkUser('me')
      const ok = { targetType: 'USER', targetId: 1, reason: 'SPAM' }
      const bad: Record<string, unknown>[] = [
        { ...ok, targetType: 'MESSAGE' },
        { ...ok, reason: 'DISLIKE' },
        { ...ok, targetId: 0 },
        { ...ok, targetId: 'abc' },
        { ...ok, note: 'x'.repeat(501) },
        { ...ok, status: 'REVIEWED' },
        { targetType: 'USER', targetId: 1 },
        {},
      ]
      for (const body of bad) expect((await send(me, body)).status).toBe(400)
      expect(await count()).toBe(0)
    })
  })
})
