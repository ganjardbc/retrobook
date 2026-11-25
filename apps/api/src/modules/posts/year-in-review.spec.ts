// Tes integrasi ke MySQL uji. Menguji post dan aturan visibilitas (docs/07-test-plan.md 3.3).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'rb-posts-'))

import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { Privacy, User, UserStatus } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { PrismaService } from '../../prisma/prisma.service'
import { resetDb } from '../../test/db'

describe('Year in Review (integrasi)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwt: JwtService
  let n = 0

  const mkUser = (name: string, extra: Partial<User> = {}) =>
    prisma.user.create({
      data: {
        email: `${name}${++n}@example.com`,
        username: `${name}${n}`,
        displayName: name,
        passwordHash: 'x',
        ...extra,
      },
    })
  const tokenOf = (u: User) => jwt.sign({ sub: u.id, role: u.role })
  const api = (u: User) => ({
    get: (p: string) =>
      request(app.getHttpServer())
        .get(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
    post: (p: string) =>
      request(app.getHttpServer())
        .post(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
    put: (p: string) =>
      request(app.getHttpServer())
        .put(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
    patch: (p: string) =>
      request(app.getHttpServer())
        .patch(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
    del: (p: string) =>
      request(app.getHttpServer())
        .delete(`/api${p}`)
        .set('Authorization', `Bearer ${tokenOf(u)}`),
  })

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
    jwt = app.get(JwtService)
  })
  beforeEach(() => resetDb(prisma))
  afterAll(async () => {
    await resetDb(prisma)
    await app.close()
    rmSync(process.env.UPLOAD_DIR!, { recursive: true, force: true })
  })

  describe('Year in Review (YIR-01)', () => {
    it('menghitung post, foto, like, komentar, dan post terpopuler tahun itu', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const at = (m: number) => new Date(Date.UTC(2014, m, 5))
      const a = await prisma.post.create({
        data: { authorId: alice.id, content: 'a', createdAt: at(1), privacy: Privacy.PUBLIC },
      })
      const b = await prisma.post.create({
        data: {
          authorId: alice.id,
          content: 'b',
          imageUrl: '/u/x.png',
          createdAt: at(2),
          privacy: Privacy.PUBLIC,
        },
      })
      await prisma.post.create({
        data: {
          authorId: alice.id,
          content: 'lain tahun',
          createdAt: new Date(Date.UTC(2013, 1, 1)),
        },
      })
      await prisma.like.create({ data: { userId: bob.id, postId: b.id } })
      await prisma.comment.create({ data: { postId: a.id, authorId: bob.id, content: 'hi' } })
      const res = await api(alice).get('/year-in-review?year=2014').expect(200)
      expect(res.body).toMatchObject({
        year: 2014,
        years: [2014, 2013],
        postCount: 2,
        photoCount: 1,
        likeCount: 1,
        commentCount: 1,
        topPost: { id: b.id },
      })
    })

    it('like dari akun BANNED tidak dihitung; tahun kosong dan tahun tak valid', async () => {
      const alice = await mkUser('alice')
      const bad = await mkUser('bad', { status: UserStatus.BANNED })
      const p = await prisma.post.create({
        data: { authorId: alice.id, content: 'a', createdAt: new Date(Date.UTC(2014, 1, 5)) },
      })
      await prisma.like.create({ data: { userId: bad.id, postId: p.id } })
      expect((await api(alice).get('/year-in-review?year=2014')).body.likeCount).toBe(0)
      const empty = await api(alice).get('/year-in-review?year=2010').expect(200)
      expect(empty.body).toMatchObject({ postCount: 0, topPost: null })
      await api(alice).get('/year-in-review?year=abc').expect(400)
    })
  })
})
