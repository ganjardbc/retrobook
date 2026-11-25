// Tes integrasi ke MySQL uji (TEST_DATABASE_URL). Jangan pernah diarahkan ke database dev.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}

import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { PrismaService } from '../../prisma/prisma.service'
import { resetDb } from '../../test/db'
import { hashToken } from './token.util'

const body = {
  email: 'budi@example.com',
  username: 'budi_01',
  displayName: 'Budi',
  password: 'password123',
}

describe('Auth (integrasi)', () => {
  let app: INestApplication
  let prisma: PrismaService
  const post = (path: string) => request(app.getHttpServer()).post(`/api${path}`)

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    prisma = app.get(PrismaService)
  })
  beforeEach(() => resetDb(prisma))
  afterAll(async () => {
    await resetDb(prisma)
    await app.close()
  })

  describe('register (AUTH-01)', () => {
    it('berhasil: 201, token, tanpa password di respons, hash argon2 di database', async () => {
      const res = await post('/auth/register').send(body)
      expect(res.status).toBe(201)
      expect(res.body.user).toEqual({
        id: expect.any(String),
        username: 'budi_01',
        displayName: 'Budi',
        avatarUrl: null,
        role: 'USER',
      })
      expect(res.body.accessToken).toEqual(expect.any(String))
      expect(JSON.stringify(res.body)).not.toMatch(/password|argon2/i)
      const row = await prisma.user.findUniqueOrThrow({ where: { email: body.email } })
      expect(row.passwordHash).toMatch(/^\$argon2id\$/)
      const stored = await prisma.refreshToken.findFirstOrThrow({ where: { userId: row.id } })
      expect(stored.tokenHash).toBe(hashToken(res.body.refreshToken))
    })

    it('email kembar (beda huruf besar) dan username kembar: 409', async () => {
      await post('/auth/register').send(body)
      const dupEmail = await post('/auth/register').send({
        ...body,
        email: 'BUDI@example.com',
        username: 'lain',
      })
      expect(dupEmail.status).toBe(409)
      expect(dupEmail.body.code).toBe('EMAIL_TAKEN')
      const dupUser = await post('/auth/register').send({
        ...body,
        email: 'lain@example.com',
        username: 'BUDI_01',
      })
      expect(dupUser.status).toBe(409)
      expect(dupUser.body.code).toBe('USERNAME_TAKEN')
    })

    it.each([
      ['password 7 karakter', { password: '1234567' }],
      ['username terlalu pendek', { username: 'ab' }],
      ['username berspasi', { username: 'bud i' }],
      ['email tidak valid', { email: 'bukan-email' }],
    ])('ditolak: %s', async (_name, patch) => {
      const res = await post('/auth/register').send({ ...body, ...patch })
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_FAILED')
    })

    it('username rute cadangan ditolak', async () => {
      const res = await post('/auth/register').send({ ...body, username: 'Admin' })
      expect(res.status).toBe(409)
      expect(res.body.code).toBe('USERNAME_TAKEN')
    })
  })

  describe('login (AUTH-02)', () => {
    beforeEach(async () => {
      await post('/auth/register').send(body)
    })

    it('dengan username dan dengan email', async () => {
      for (const identifier of ['budi_01', 'Budi@Example.com']) {
        const res = await post('/auth/login').send({ identifier, password: body.password })
        expect(res.status).toBe(200)
        expect(res.body.refreshToken).toEqual(expect.any(String))
      }
    })

    it('salah password dan akun tidak ada: respons sama persis', async () => {
      const wrong = await post('/auth/login').send({
        identifier: 'budi_01',
        password: 'salahsalah',
      })
      const none = await post('/auth/login').send({
        identifier: 'tidak_ada',
        password: 'salahsalah',
      })
      expect(wrong.status).toBe(401)
      expect(wrong.body).toEqual(none.body)
      expect(wrong.body.code).toBe('INVALID_CREDENTIALS')
    })

    it.each([
      ['SUSPENDED', 'ACCOUNT_SUSPENDED'],
      ['BANNED', 'ACCOUNT_BANNED'],
    ] as const)('akun %s: 403 %s, tanpa token', async (status, code) => {
      await prisma.user.update({ where: { email: body.email }, data: { status } })
      const res = await post('/auth/login').send({ identifier: 'budi_01', password: body.password })
      expect(res.status).toBe(403)
      expect(res.body.code).toBe(code)
      expect(res.body.accessToken).toBeUndefined()
    })

    it('akun bot tidak bisa login (BR-09)', async () => {
      await prisma.user.update({ where: { email: body.email }, data: { isBot: true } })
      const res = await post('/auth/login').send({ identifier: 'budi_01', password: body.password })
      expect(res.status).toBe(401)
    })

    it('akun terhapus (soft delete) tidak bisa login', async () => {
      await prisma.user.update({ where: { email: body.email }, data: { deletedAt: new Date() } })
      const res = await post('/auth/login').send({ identifier: 'budi_01', password: body.password })
      expect(res.status).toBe(401)
    })
  })

  describe('refresh (AUTH-03)', () => {
    it('rotasi: token baru, token lama tidak bisa dipakai lagi', async () => {
      const first = (await post('/auth/register').send(body)).body
      const second = await post('/auth/refresh').send({ refreshToken: first.refreshToken })
      expect(second.status).toBe(200)
      expect(second.body.refreshToken).not.toBe(first.refreshToken)
      const reuse = await post('/auth/refresh').send({ refreshToken: first.refreshToken })
      expect(reuse.status).toBe(401)
    })

    it('pemakaian ulang token lama mencabut semua token user itu', async () => {
      const first = (await post('/auth/register').send(body)).body
      const second = (await post('/auth/refresh').send({ refreshToken: first.refreshToken })).body
      await post('/auth/refresh').send({ refreshToken: first.refreshToken }) // dianggap pencurian
      const res = await post('/auth/refresh').send({ refreshToken: second.refreshToken })
      expect(res.status).toBe(401)
    })

    it('refresh token kedaluwarsa: 401 TOKEN_EXPIRED', async () => {
      const first = (await post('/auth/register').send(body)).body
      await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })
      const res = await post('/auth/refresh').send({ refreshToken: first.refreshToken })
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('TOKEN_EXPIRED')
    })

    it('token asal-asalan: 401', async () => {
      const res = await post('/auth/refresh').send({ refreshToken: 'ngawur' })
      expect(res.status).toBe(401)
    })

    it('akun disuspend setelah login: refresh ditolak 403', async () => {
      const first = (await post('/auth/register').send(body)).body
      await prisma.user.update({ where: { email: body.email }, data: { status: 'SUSPENDED' } })
      const res = await post('/auth/refresh').send({ refreshToken: first.refreshToken })
      expect(res.status).toBe(403)
    })
  })

  describe('logout dan guard', () => {
    it('logout mencabut refresh token (204)', async () => {
      const s = (await post('/auth/register').send(body)).body
      const out = await post('/auth/logout')
        .set('Authorization', `Bearer ${s.accessToken}`)
        .send({ refreshToken: s.refreshToken })
      expect(out.status).toBe(204)
      const res = await post('/auth/refresh').send({ refreshToken: s.refreshToken })
      expect(res.status).toBe(401)
    })

    it('logout tidak bisa mencabut token milik user lain', async () => {
      const a = (await post('/auth/register').send(body)).body
      const b = (
        await post('/auth/register').send({ ...body, email: 'siti@example.com', username: 'siti' })
      ).body
      await post('/auth/logout')
        .set('Authorization', `Bearer ${b.accessToken}`)
        .send({ refreshToken: a.refreshToken })
      const res = await post('/auth/refresh').send({ refreshToken: a.refreshToken })
      expect(res.status).toBe(200)
    })

    it('tanpa token: 401 UNAUTHORIZED', async () => {
      const res = await post('/auth/logout').send({ refreshToken: 'x' })
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('UNAUTHORIZED')
    })

    it('access token kedaluwarsa: 401 TOKEN_EXPIRED', async () => {
      const s = (await post('/auth/register').send(body)).body
      const old = await app
        .get(JwtService)
        .signAsync({ sub: s.user.id, role: 'USER' }, { expiresIn: -10 })
      const res = await post('/auth/logout')
        .set('Authorization', `Bearer ${old}`)
        .send({ refreshToken: 'x' })
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('TOKEN_EXPIRED')
    })

    it('suspend berlaku pada request berikutnya meski access token masih valid', async () => {
      const s = (await post('/auth/register').send(body)).body
      await prisma.user.update({ where: { id: s.user.id }, data: { status: 'BANNED' } })
      const res = await post('/auth/logout')
        .set('Authorization', `Bearer ${s.accessToken}`)
        .send({ refreshToken: s.refreshToken })
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('ACCOUNT_BANNED')
    })

    it('health tetap publik', async () => {
      const res = await request(app.getHttpServer()).get('/api/health')
      expect(res.status).toBe(200)
    })
  })
})
