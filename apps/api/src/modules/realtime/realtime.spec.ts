// Tes integrasi gateway /realtime (T-31, CHT-02): auth token, room per user, presence.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { User } from '@prisma/client'
import { io, Socket } from 'socket.io-client'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'
import { RealtimeGateway } from './realtime.gateway'

describe('Realtime /realtime (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  let url: string
  const open: Socket[] = []

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.listen(0)
    url = `${await app.getUrl()}/realtime`.replace('[::1]', '127.0.0.1')
    h = testHelpers(app)
  })
  beforeEach(() => resetDb(h.prisma))
  afterEach(() => {
    open.splice(0).forEach((s) => s.close())
  })
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  const connect = (auth: Record<string, unknown>) => {
    const s = io(url, { auth, transports: ['websocket'], reconnection: false })
    open.push(s)
    return s
  }
  const connected = (s: Socket) =>
    new Promise<void>((res, rej) => {
      s.on('connect', () => res())
      s.on('connect_error', (e) => rej(e))
    })
  const asUser = async (u: User, extra: Record<string, unknown> = {}) => {
    const s = connect({ token: h.tokenOf(u), ...extra })
    await connected(s)
    return s
  }
  const next = <T>(s: Socket, event: string) =>
    new Promise<T>((res) => s.once(event, (p: T) => res(p)))
  /** Menunggu sebentar untuk memastikan sebuah event TIDAK datang. */
  const silent = (s: Socket, event: string, ms = 300) =>
    new Promise<boolean>((res) => {
      let got = false
      s.once(event, () => (got = true))
      setTimeout(() => res(!got), ms)
    })

  describe('autentikasi', () => {
    it.each([
      ['tanpa token', {}],
      ['token sampah', { token: 'bukan-jwt' }],
    ])('%s: ditolak UNAUTHORIZED', async (_n, auth) => {
      await expect(connected(connect(auth))).rejects.toThrow('UNAUTHORIZED')
    })

    it.each([['SUSPENDED'], ['BANNED']] as const)('akun %s ditolak', async (status) => {
      const u = await h.mkUser('x', { status })
      await expect(connected(connect({ token: h.tokenOf(u) }))).rejects.toThrow('UNAUTHORIZED')
    })

    it('akun terhapus ditolak', async () => {
      const u = await h.mkUser('x', { deletedAt: new Date() })
      await expect(connected(connect({ token: h.tokenOf(u) }))).rejects.toThrow('UNAUTHORIZED')
    })
  })

  it('user masuk room sendiri: emitToUser sampai ke semua koneksinya saja', async () => {
    const a = await h.mkUser('a')
    const b = await h.mkUser('b')
    const a1 = await asUser(a)
    const a2 = await asUser(a)
    const sb = await asUser(b)
    const gw = app.get(RealtimeGateway)
    const got = Promise.all([next(a1, 'ping'), next(a2, 'ping')])
    const other = silent(sb, 'ping')
    gw.emitToUser(a.id, 'ping', { n: 1 })
    expect(await got).toEqual([{ n: 1 }, { n: 1 }])
    expect(await other).toBe(true)
  })

  it('label klien diambil dari auth.client (default WEB)', async () => {
    const a = await h.mkUser('a')
    await asUser(a)
    await asUser(a, { client: 'mobile' })
    expect((await app.get(RealtimeGateway).clientsOf(a.id)).sort()).toEqual(['MOBILE', 'WEB'])
  })

  describe('presence', () => {
    it('teman menerima online dan offline; non-teman tidak', async () => {
      const a = await h.mkUser('a')
      const friend = await h.mkUser('f')
      const stranger = await h.mkUser('s')
      await h.befriend(a, friend)
      const sf = await asUser(friend)
      const ss = await asUser(stranger)

      const online = next(sf, 'presence')
      const strangerQuiet = silent(ss, 'presence')
      const sa = await asUser(a)
      expect(await online).toEqual({ userId: a.id, online: true, client: 'WEB' })
      expect(await strangerQuiet).toBe(true)

      const offline = next(sf, 'presence')
      sa.close()
      expect(await offline).toEqual({ userId: a.id, online: false })
      const row = await h.prisma.user.findUniqueOrThrow({ where: { id: a.id } })
      expect(row.lastSeenAt).not.toBeNull()
    })

    it('offline hanya setelah koneksi terakhir putus', async () => {
      const a = await h.mkUser('a')
      const f = await h.mkUser('f')
      await h.befriend(a, f)
      const sf = await asUser(f)
      const first = next(sf, 'presence')
      const a1 = await asUser(a)
      await first
      const a2 = await asUser(a)

      const quiet = silent(sf, 'presence')
      a1.close()
      expect(await quiet).toBe(true)
      const offline = next(sf, 'presence')
      a2.close()
      expect(await offline).toEqual({ userId: a.id, online: false })
    })

    it('teman yang diblokir (dua arah) tidak menerima presence', async () => {
      const a = await h.mkUser('a')
      const f = await h.mkUser('f')
      await h.befriend(a, f)
      await h.prisma.block.create({ data: { blockerId: f.id, blockedId: a.id } })
      const sf = await asUser(f)
      const quiet = silent(sf, 'presence')
      await asUser(a)
      expect(await quiet).toBe(true)
    })

    it('permintaan teman PENDING bukan teman', async () => {
      const a = await h.mkUser('a')
      const f = await h.mkUser('f')
      await h.befriend(a, f, 'PENDING')
      const sf = await asUser(f)
      const quiet = silent(sf, 'presence')
      await asUser(a)
      expect(await quiet).toBe(true)
    })
  })
})
