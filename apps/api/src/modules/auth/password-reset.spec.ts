// Tes integrasi reset password (T-70, AUTH-05).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as argon2 from 'argon2'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'
import { Mail, Mailer } from '../mail/mailer'

describe('Reset password (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  const sent: Mail[] = []
  const http = () => request(app.getHttpServer())

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Mailer)
      .useValue({ send: async (m: Mail) => void sent.push(m) })
      .compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    h = testHelpers(app)
  })
  beforeEach(async () => {
    sent.length = 0
    await resetDb(h.prisma)
  })
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  const tokenFrom = (mail: Mail) => /token=([\w-]+)/.exec(mail.text)![1]!
  const mkUser = async (name = 'budi') =>
    h.mkUser(name, {
      email: `${name}@example.com`,
      passwordHash: await argon2.hash('password-lama-1'),
    })
  const forgot = (email: string) => http().post('/api/auth/forgot-password').send({ email })
  const reset = (token: string, password: string) =>
    http().post('/api/auth/reset-password').send({ token, password })

  it('forgot: 202 sama untuk email terdaftar dan tidak; email hanya terkirim ke yang terdaftar; token hanya hash di DB', async () => {
    await mkUser()
    const known = await forgot('budi@example.com')
    const unknown = await forgot('tidak-ada@example.com')
    expect([known.status, unknown.status]).toEqual([202, 202])
    expect(known.body).toEqual(unknown.body)
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toBe('budi@example.com')
    const token = tokenFrom(sent[0]!)
    const rows = await h.prisma.passwordResetToken.findMany()
    expect(rows).toHaveLength(1)
    expect(JSON.stringify(rows)).not.toContain(token)
    expect((await forgot('bukan-email')).status).toBe(400)
  })

  it('reset: mengganti password, mencabut sesi, login baru berhasil dan lama gagal; token sekali pakai', async () => {
    const user = await mkUser()
    const login = await http()
      .post('/api/auth/login')
      .send({ identifier: 'budi@example.com', password: 'password-lama-1' })
    expect(login.status).toBe(200)
    await forgot(user.email)
    const token = tokenFrom(sent[0]!)
    expect((await reset(token, 'pendek')).status).toBe(400)
    expect((await reset(token, 'password-baru-22')).status).toBe(204)
    expect(
      (
        await http()
          .post('/api/auth/login')
          .send({ identifier: user.email, password: 'password-baru-22' })
      ).status,
    ).toBe(200)
    expect(
      (
        await http()
          .post('/api/auth/login')
          .send({ identifier: user.email, password: 'password-lama-1' })
      ).status,
    ).toBe(401)
    expect(
      (await http().post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken }))
        .status,
    ).toBe(401)
    expect((await reset(token, 'password-lain-333')).status).toBe(400)
  })

  it('token salah, kedaluwarsa, atau digantikan permintaan baru ditolak', async () => {
    const user = await mkUser()
    expect((await reset('x'.repeat(40), 'password-baru-22')).status).toBe(400)
    await forgot(user.email)
    const old = tokenFrom(sent[0]!)
    await forgot(user.email)
    expect((await reset(old, 'password-baru-22')).status).toBe(400)
    const fresh = tokenFrom(sent[1]!)
    await h.prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    expect((await reset(fresh, 'password-baru-22')).status).toBe(400)
    expect((await h.prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash).toBe(
      user.passwordHash,
    )
  })

  it('bot dan akun terhapus tidak menerima email; dua reset bersamaan: tepat satu berhasil', async () => {
    await h.mkUser('botty', { email: 'bot@example.com', isBot: true })
    await h.mkUser('gone', { email: 'gone@example.com', deletedAt: new Date() })
    await forgot('bot@example.com')
    await forgot('gone@example.com')
    expect(sent).toHaveLength(0)
    const user = await mkUser('siti')
    await forgot(user.email)
    const token = tokenFrom(sent[0]!)
    const results = await Promise.all([
      reset(token, 'password-baru-aa1'),
      reset(token, 'password-baru-bb2'),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([204, 400])
  })
})
