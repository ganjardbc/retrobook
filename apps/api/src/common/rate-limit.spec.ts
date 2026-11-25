// Tes integrasi batas laju (T-40, BR-10, API spec 1.2). Limiter mati di bawah Jest; di sini dinyalakan
// dengan jam buatan supaya jendela menit dan jam bisa dilewati tanpa menunggu.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as argon2 from 'argon2'
import { io, Socket } from 'socket.io-client'
import request from 'supertest'
import { AppModule } from '../app.module'
import { resetDb } from '../test/db'
import { testHelpers } from '../test/helpers'
import { configureApp } from './configure-app'
import { RateLimiter } from './rate-limit'

const MIN = 60_000
const HOUR = 60 * MIN

describe('Batas laju (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  let limiter: RateLimiter
  let url: string
  let clock = 0
  const open: Socket[] = []
  const http = () => request(app.getHttpServer())

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.listen(0)
    url = `${await app.getUrl()}/realtime`.replace('[::1]', '127.0.0.1')
    h = testHelpers(app)
    limiter = app.get(RateLimiter)
  })
  beforeEach(async () => {
    await resetDb(h.prisma)
    clock = 1_000_000
    limiter.now = () => clock
    limiter.enabled = true
    limiter.reset()
  })
  afterEach(() => {
    open.splice(0).forEach((s) => s.close())
  })
  afterAll(async () => {
    limiter.enabled = false
    limiter.now = () => Date.now()
    await resetDb(h.prisma)
    await app.close()
  })

  const login = (identifier: string, password: string) =>
    http().post('/api/auth/login').send({ identifier, password })
  const register = (n: number) =>
    http()
      .post('/api/auth/register')
      .send({
        email: `u${n}@example.com`,
        username: `user_${n}`,
        displayName: `User ${n}`,
        password: 'password-ok-123',
      })
  const mkAccount = async (name: string, password = 'benar-123456') =>
    h.mkUser(name, { passwordHash: await argon2.hash(password) })

  describe('bentuk respons 429', () => {
    it('{ statusCode, message, code } dengan header Retry-After dalam detik', async () => {
      for (let i = 0; i < 10; i++) await login('nobody-a', 'x')
      const res = await login('nobody-b', 'x')
      expect(res.status).toBe(429)
      expect(res.body).toEqual({
        statusCode: 429,
        message: expect.any(String),
        code: 'RATE_LIMITED',
      })
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
      expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(60)
    })
  })

  describe('POST /auth/login: 10 per menit per IP', () => {
    it('10 pertama lewat (401 kredensial salah), ke-11 ditolak 429, normal lagi setelah jendela', async () => {
      const codes: number[] = []
      for (let i = 0; i < 11; i++) codes.push((await login(`ghost${i}`, 'x')).status)
      expect(codes).toEqual([...Array(10).fill(401), 429])
      clock += MIN + 1
      expect((await login('ghost-again', 'x')).status).toBe(401)
    })

    it('login berhasil juga dihitung', async () => {
      const u = await mkAccount('ok')
      for (let i = 0; i < 10; i++) expect((await login(u.email, 'benar-123456')).status).toBe(200)
      expect((await login(u.email, 'benar-123456')).status).toBe(429)
    })
  })

  describe('lockout akun: 5 gagal beruntun = jeda 5 menit', () => {
    it('gagal kelima mengunci; login benar pun ditolak 429 dengan Retry-After sekitar 300 detik', async () => {
      const u = await mkAccount('victim')
      for (let i = 0; i < 4; i++) expect((await login(u.email, 'salah')).status).toBe(401)
      expect((await login(u.email, 'salah')).status).toBe(401) // gagal ke-5 sendiri tetap 401
      const locked = await login(u.email, 'benar-123456')
      expect(locked.status).toBe(429)
      expect(locked.body.code).toBe('RATE_LIMITED')
      expect(Number(locked.headers['retry-after'])).toBeGreaterThan(290)
      expect(Number(locked.headers['retry-after'])).toBeLessThanOrEqual(300)
    })

    it('akun lain tidak terpengaruh; identifier beda huruf besar kecil terkunci sama', async () => {
      const a = await mkAccount('aaa')
      const b = await mkAccount('bbb')
      for (let i = 0; i < 5; i++) await login(a.email.toUpperCase(), 'salah')
      expect((await login(a.email, 'benar-123456')).status).toBe(429)
      expect((await login(b.email, 'benar-123456')).status).toBe(200)
    })

    it('bebas lagi setelah 5 menit', async () => {
      const u = await mkAccount('late')
      for (let i = 0; i < 5; i++) await login(u.email, 'salah')
      clock += 5 * MIN + 1
      limiter.reset() // jendela IP juga sudah lewat di dunia nyata
      expect((await login(u.email, 'benar-123456')).status).toBe(200)
    })

    it('berhasil di tengah menghapus hitungan: 4 gagal, 1 sukses, 4 gagal tidak mengunci', async () => {
      const u = await mkAccount('mix')
      for (let i = 0; i < 4; i++) await login(u.email, 'salah')
      expect((await login(u.email, 'benar-123456')).status).toBe(200)
      limiter.reset()
      for (let i = 0; i < 4; i++) await login(u.email, 'salah')
      expect((await login(u.email, 'benar-123456')).status).toBe(200)
    })

    it('identifier yang tidak ada juga terkunci (tidak membocorkan keberadaan akun)', async () => {
      for (let i = 0; i < 5; i++) expect((await login('hantu@example.com', 'x')).status).toBe(401)
      expect((await login('hantu@example.com', 'x')).status).toBe(429)
    })

    it('kegagalan lama (lebih dari 15 menit) dilupakan', async () => {
      const u = await mkAccount('old')
      for (let i = 0; i < 4; i++) await login(u.email, 'salah')
      clock += 16 * MIN
      limiter.reset()
      await login(u.email, 'salah') // dihitung sebagai yang pertama lagi
      expect((await login(u.email, 'benar-123456')).status).toBe(200)
    })

    it('akun ditangguhkan (403) bukan kegagalan menebak: tidak dihitung', async () => {
      const u = await mkAccount('susp')
      await h.prisma.user.update({ where: { id: u.id }, data: { status: 'SUSPENDED' } })
      for (let i = 0; i < 6; i++) expect((await login(u.email, 'benar-123456')).status).toBe(403)
      limiter.reset()
      await h.prisma.user.update({ where: { id: u.id }, data: { status: 'ACTIVE' } })
      expect((await login(u.email, 'benar-123456')).status).toBe(200)
    })
  })

  describe('POST /auth/register: 5 per jam per IP', () => {
    it('lima pendaftaran lewat, keenam 429, normal lagi setelah satu jam', async () => {
      const codes: number[] = []
      for (let i = 0; i < 6; i++) codes.push((await register(i)).status)
      expect(codes).toEqual([201, 201, 201, 201, 201, 429])
      expect(Number((await register(7)).headers['retry-after'])).toBeGreaterThan(3500)
      clock += HOUR + 1
      expect((await register(8)).status).toBe(201)
    })
  })

  describe('POST /messages/:userId: 60 per menit per user', () => {
    const pair = async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await h.befriend(a, b)
      return { a, b }
    }
    const send = (from: Parameters<typeof h.as>[0], to: string) =>
      h.as(from).post(`/messages/${to}`).send({ content: 'x' })

    it('60 lewat, ke-61 429; user lain tidak terpengaruh; normal lagi setelah semenit', async () => {
      const { a, b } = await pair()
      const c = await h.mkUser('c')
      await h.befriend(a, c)
      for (let i = 0; i < 60; i++) expect((await send(a, b.id)).status).toBe(201)
      const limited = await send(a, b.id)
      expect(limited.status).toBe(429)
      expect(limited.body.code).toBe('RATE_LIMITED')
      expect(Number(limited.headers['retry-after'])).toBeLessThanOrEqual(60)
      expect((await send(b, a.id)).status).toBe(201)
      expect(await h.prisma.message.count()).toBe(61)
      clock += MIN + 1
      expect((await send(a, c.id)).status).toBe(201)
    })

    it('batas dipakai bersama REST dan socket; ack gagal membawa RATE_LIMITED dan retryAfter', async () => {
      const { a, b } = await pair()
      for (let i = 0; i < 59; i++) await send(a, b.id)
      const s = io(url, {
        auth: { token: h.tokenOf(a) },
        transports: ['websocket'],
        reconnection: false,
      })
      open.push(s)
      await new Promise<void>((res, rej) => {
        s.on('connect', () => res())
        s.on('connect_error', rej)
      })
      const emit = () =>
        new Promise<{ ok: boolean; code?: string; retryAfter?: number }>((res) =>
          s.emit('message:send', { toUserId: b.id, content: 'via socket' }, res),
        )
      expect((await emit()).ok).toBe(true) // ke-60
      const ack = await emit() // ke-61
      expect(ack).toMatchObject({ ok: false, code: 'RATE_LIMITED' })
      expect(ack.retryAfter).toBeGreaterThan(0)
      expect((await send(a, b.id)).status).toBe(429) // REST ikut terkunci
      expect(await h.prisma.message.count()).toBe(60)
    })

    it('hanya POST yang dibatasi: riwayat dan daftar percakapan tidak', async () => {
      const { a, b } = await pair()
      for (let i = 0; i < 60; i++) await send(a, b.id)
      expect((await h.as(a).get(`/messages/${b.id}`)).status).toBe(200)
      expect((await h.as(a).get('/messages/conversations')).status).toBe(200)
    })
  })

  describe('POST /pokes: 20 per jam per user', () => {
    it('20 lewat, ke-21 429 dan tidak mengubah apa pun; user lain bebas; normal lagi setelah sejam', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      const c = await h.mkUser('c')
      await h.befriend(a, b)
      await h.befriend(b, c)
      const poke = (from: Parameters<typeof h.as>[0], to: string) =>
        h.as(from).post('/pokes').send({ userId: to })
      for (let i = 0; i < 20; i++) expect((await poke(a, b.id)).status).toBe(200)
      const before = await h.prisma.notification.count()
      const limited = await poke(a, b.id)
      expect(limited.status).toBe(429)
      expect(Number(limited.headers['retry-after'])).toBeGreaterThan(3500)
      expect(await h.prisma.notification.count()).toBe(before)
      expect((await poke(b, c.id)).status).toBe(200)
      clock += HOUR + 1
      expect((await poke(a, b.id)).status).toBe(200)
    })
  })

  describe('penghitung', () => {
    it('mati secara bawaan di bawah Jest: tidak ada 429 pada pemakaian normal', async () => {
      limiter.enabled = false
      for (let i = 0; i < 15; i++) expect((await login(`ghost${i}`, 'x')).status).toBe(401)
      for (let i = 0; i < 6; i++) await login('lockme', 'x')
      expect((await login('lockme', 'x')).status).toBe(401) // lockout ikut mati
    })

    it('jendela bersifat tetap: hitungan direset tepat saat jendela berakhir', async () => {
      for (let i = 0; i < 10; i++) await login(`g${i}`, 'x') // identifier berbeda: bukan lockout akun
      clock += MIN - 1
      expect((await login('g-baru', 'x')).status).toBe(429)
      clock += 1
      expect((await login('g-baru', 'x')).status).toBe(401)
    })
  })
})
