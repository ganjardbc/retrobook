// Tes integrasi chat (T-36, CHT-01, BR-11): REST, socket, idempotensi clientId, pemeriksaan teman dan blokir.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { User } from '@prisma/client'
import { io, Socket } from 'socket.io-client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Pesan (integrasi)', () => {
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

  const pair = async () => {
    const a = await h.mkUser('a')
    const b = await h.mkUser('b')
    await h.befriend(a, b)
    return { a, b }
  }
  const send = (from: User, to: User | number, content: string, clientId?: string) =>
    h
      .as(from)
      .post(`/messages/${typeof to === 'number' ? to : to.id}`)
      .send({ content, ...(clientId ? { clientId } : {}) })
  const connect = async (u: User) => {
    const s = io(url, {
      auth: { token: h.tokenOf(u) },
      transports: ['websocket'],
      reconnection: false,
    })
    open.push(s)
    await new Promise<void>((res, rej) => {
      s.on('connect', () => res())
      s.on('connect_error', rej)
    })
    return s
  }
  const next = <T>(s: Socket, e: string) => new Promise<T>((res) => s.once(e, (p: T) => res(p)))
  const silent = (s: Socket, e: string, ms = 300) =>
    new Promise<boolean>((res) => {
      let got = false
      s.once(e, () => (got = true))
      setTimeout(() => res(!got), ms)
    })
  const emitAck = <T>(s: Socket, e: string, body: unknown) =>
    new Promise<T>((res) => s.emit(e, body, res))

  it('tanpa token: 401', async () => {
    expect((await request(app.getHttpServer()).get('/api/messages/conversations')).status).toBe(401)
  })

  describe('POST /messages/:userId', () => {
    it('teman: 201 dengan pesan, tersimpan sebagai belum dibaca', async () => {
      const { a, b } = await pair()
      const res = await send(a, b, '  halo  ')
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        senderId: a.id,
        receiverId: b.id,
        content: 'halo',
        readAt: null,
      })
      expect(await h.prisma.message.count()).toBe(1)
    })

    it.each([
      ['bukan teman', async () => void (await h.prisma.friendship.deleteMany())],
      [
        'permintaan PENDING',
        async (a: User, b: User) => {
          await h.prisma.friendship.deleteMany()
          await h.befriend(a, b, 'PENDING')
        },
      ],
      [
        'diblokir',
        async (a: User, b: User) =>
          void (await h.prisma.block.create({ data: { blockerId: b.id, blockedId: a.id } })),
      ],
      [
        'BANNED',
        async (_a: User, b: User) =>
          void (await h.prisma.user.update({ where: { id: b.id }, data: { status: 'BANNED' } })),
      ],
      [
        'terhapus',
        async (_a: User, b: User) =>
          void (await h.prisma.user.update({
            where: { id: b.id },
            data: { deletedAt: new Date() },
          })),
      ],
    ])('lawan %s: 404 yang sama, tidak ada pesan', async (_n, setup) => {
      const { a, b } = await pair()
      await setup(a, b)
      const res = await send(a, b, 'halo')
      expect(res.status).toBe(404)
      expect(res.body.code).toBe('NOT_FOUND')
      expect(await h.prisma.message.count()).toBe(0)
    })

    it('diri sendiri 422; id tidak ada 404', async () => {
      const a = await h.mkUser('a')
      expect((await send(a, a, 'x')).status).toBe(422)
      expect((await send(a, 999999, 'x')).status).toBe(404)
    })

    it.each([
      ['kosong', ''],
      ['spasi saja', '   '],
      ['lebih dari 2.000 karakter', 'x'.repeat(2001)],
    ])('isi %s: 400', async (_n, content) => {
      const { a, b } = await pair()
      expect((await send(a, b, content)).status).toBe(400)
      expect(await h.prisma.message.count()).toBe(0)
    })

    it('tepat 2.000 karakter diterima; field asing dan clientId buruk ditolak', async () => {
      const { a, b } = await pair()
      expect((await send(a, b, 'x'.repeat(2000))).status).toBe(201)
      expect((await h.as(a).post(`/messages/${b.id}`).send({ content: 'x', foo: 1 })).status).toBe(
        400,
      )
      expect((await send(a, b, 'x', 'bad id!')).status).toBe(400)
    })

    it('clientId sama dikirim dua kali: satu pesan, balasan kedua 200 dengan id yang sama', async () => {
      const { a, b } = await pair()
      const first = await send(a, b, 'halo', 'c-1')
      const again = await send(a, b, 'halo', 'c-1')
      expect(first.status).toBe(201)
      expect(again.status).toBe(200)
      expect(again.body.id).toBe(first.body.id)
      expect(await h.prisma.message.count()).toBe(1)
    })

    it('kirim serentak dengan clientId sama: tetap satu pesan', async () => {
      const { a, b } = await pair()
      const rs = await Promise.all([
        send(a, b, 'x', 'same'),
        send(a, b, 'x', 'same'),
        send(a, b, 'x', 'same'),
      ])
      expect(new Set(rs.map((r) => r.body.id)).size).toBe(1)
      expect(await h.prisma.message.count()).toBe(1)
    })

    it('clientId yang sama dari pengirim berbeda tidak bentrok', async () => {
      const { a, b } = await pair()
      const c = await h.mkUser('c')
      await h.befriend(c, b)
      await send(a, b, 'dari a', 'x')
      await send(c, b, 'dari c', 'x')
      expect(await h.prisma.message.count()).toBe(2)
    })
  })

  describe('GET /messages/:userId (riwayat)', () => {
    it('terbaru dulu, dua arah, dengan cursor ke pesan lebih lama', async () => {
      const { a, b } = await pair()
      for (const [from, to, t] of [
        [a, b, '1'],
        [b, a, '2'],
        [a, b, '3'],
        [b, a, '4'],
      ] as const) {
        await send(from, to, t)
      }
      const p1 = (await h.as(a).get(`/messages/${b.id}?limit=3`)).body
      expect(p1.items.map((m: { content: string }) => m.content)).toEqual(['4', '3', '2'])
      const p2 = (await h.as(a).get(`/messages/${b.id}?limit=3&cursor=${p1.nextCursor}`)).body
      expect(p2.items.map((m: { content: string }) => m.content)).toEqual(['1'])
      expect(p2.nextCursor).toBeNull()
    })

    it('tidak membocorkan percakapan lain; bukan teman 404; pesan terhapus tidak muncul', async () => {
      const { a, b } = await pair()
      const c = await h.mkUser('c')
      await h.befriend(a, c)
      await send(a, b, 'rahasia a-b')
      const id = (await send(a, c, 'hapus aku')).body.id
      await h.prisma.message.update({ where: { id }, data: { deletedAt: new Date() } })
      expect((await h.as(c).get(`/messages/${a.id}`)).body.items).toEqual([])
      expect((await h.as(a).get(`/messages/${c.id}`)).body.items).toEqual([])
      const stranger = await h.mkUser('s')
      expect((await h.as(stranger).get(`/messages/${a.id}`)).status).toBe(404)
    })

    it('setelah unfriend atau blokir: riwayat 404', async () => {
      const { a, b } = await pair()
      await send(a, b, 'halo')
      await h.prisma.friendship.deleteMany()
      expect((await h.as(a).get(`/messages/${b.id}`)).status).toBe(404)
      expect((await h.as(b).get(`/messages/${a.id}`)).status).toBe(404)
    })
  })

  describe('POST /messages/:userId/read', () => {
    it('menandai pesan dari lawan terbaca; milik sendiri dan percakapan lain tetap', async () => {
      const { a, b } = await pair()
      const c = await h.mkUser('c')
      await h.befriend(b, c)
      await send(a, b, 'dari a')
      await send(b, a, 'dari b')
      await send(c, b, 'dari c')
      const res = await h.as(b).post(`/messages/${a.id}/read`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ updated: 1 })
      const rows = await h.prisma.message.findMany({ orderBy: { id: 'asc' } })
      expect(rows.map((r) => r.readAt !== null)).toEqual([true, false, false])
      expect((await h.as(b).post(`/messages/${a.id}/read`)).body).toEqual({ updated: 0 }) // diulang aman
    })

    it('bukan teman: 404', async () => {
      const a = await h.mkUser('a')
      const s = await h.mkUser('s')
      expect((await h.as(a).post(`/messages/${s.id}/read`)).status).toBe(404)
    })
  })

  describe('GET /messages/conversations dan unread-count', () => {
    it('satu baris per teman, pesan terakhir, belum dibaca, terbaru dulu', async () => {
      const me = await h.mkUser('me')
      const [f1, f2, f3] = await Promise.all(['f1', 'f2', 'f3'].map((n) => h.mkUser(n)))
      for (const f of [f1!, f2!, f3!]) await h.befriend(me, f)
      await send(f1!, me, 'a1')
      await send(me, f2!, 'b1')
      await send(f1!, me, 'a2')
      await send(f2!, me, 'b2')
      // f3 tanpa percakapan

      const res = (await h.as(me).get('/messages/conversations')).body
      expect(res.items.map((i: { user: User }) => i.user.id)).toEqual([f2!.id, f1!.id])
      expect(res.items[0]).toMatchObject({ lastMessage: { content: 'b2' }, unreadCount: 1 })
      expect(res.items[1]).toMatchObject({ lastMessage: { content: 'a2' }, unreadCount: 2 })
      expect((await h.as(me).get('/messages/unread-count')).body).toEqual({ count: 3 })

      await h.as(me).post(`/messages/${f1!.id}/read`)
      expect((await h.as(me).get('/messages/unread-count')).body).toEqual({ count: 1 })
      const p1 = (await h.as(me).get('/messages/conversations?limit=1')).body
      expect(p1.items).toHaveLength(1)
      const p2 = (await h.as(me).get(`/messages/conversations?limit=1&cursor=${p1.nextCursor}`))
        .body
      expect(p2.items.map((i: { user: User }) => i.user.id)).toEqual([f1!.id])
      expect(p2.nextCursor).toBeNull()
    })

    it.each([
      [
        'unfriend',
        (a: User) =>
          h.prisma.friendship.deleteMany({
            where: { OR: [{ requesterId: a.id }, { addresseeId: a.id }] },
          }),
      ],
      [
        'blokir',
        (a: User, b: User) => h.prisma.block.create({ data: { blockerId: a.id, blockedId: b.id } }),
      ],
      [
        'BANNED',
        (_a: User, b: User) =>
          h.prisma.user.update({ where: { id: b.id }, data: { status: 'BANNED' } }),
      ],
    ])('lawan setelah %s: hilang dari percakapan dan hitungan', async (_n, change) => {
      const { a, b } = await pair()
      await send(b, a, 'halo')
      expect((await h.as(a).get('/messages/conversations')).body.items).toHaveLength(1)
      await change(a, b)
      expect((await h.as(a).get('/messages/conversations')).body.items).toEqual([])
      expect((await h.as(a).get('/messages/unread-count')).body).toEqual({ count: 0 })
    })

    it('tanpa teman atau pesan: kosong', async () => {
      const a = await h.mkUser('a')
      expect((await h.as(a).get('/messages/conversations')).body).toEqual({
        items: [],
        nextCursor: null,
      })
    })
  })

  describe('GET /chat/friends (sidebar)', () => {
    const connectAs = async (u: User, client?: string) => {
      const s = io(url, {
        auth: { token: h.tokenOf(u), ...(client ? { client } : {}) },
        transports: ['websocket'],
        reconnection: false,
      })
      open.push(s)
      await new Promise<void>((res, rej) => {
        s.on('connect', () => res())
        s.on('connect_error', rej)
      })
      return s
    }
    const items = async (u: User) => (await h.as(u).get('/chat/friends')).body.items

    it('tanpa teman: kosong', async () => {
      const a = await h.mkUser('a')
      expect(await items(a)).toEqual([])
    })

    it('menyertakan lastSeenAt teman (ISO atau null)', async () => {
      const me = await h.mkUser('me')
      const seen = await h.mkUser('seen')
      const never = await h.mkUser('never')
      await h.befriend(me, seen)
      await h.befriend(me, never)
      const at = new Date('2026-01-02T03:04:05.000Z')
      await h.prisma.user.update({ where: { id: seen.id }, data: { lastSeenAt: at } })
      const byId = new Map(
        (await items(me)).map((i: { user: User; lastSeenAt: string | null }) => [i.user.id, i]),
      )
      expect((byId.get(seen.id) as { lastSeenAt: string }).lastSeenAt).toBe(at.toISOString())
      expect((byId.get(never.id) as { lastSeenAt: null }).lastSeenAt).toBeNull()
    })

    it('hanya teman ACCEPTED yang terlihat; PENDING, orang asing, diblokir, BANNED tidak', async () => {
      const me = await h.mkUser('me')
      const ok = await h.mkUser('ok')
      const pending = await h.mkUser('pending')
      const stranger = await h.mkUser('stranger')
      const blocked = await h.mkUser('blocked')
      const banned = await h.mkUser('banned')
      await h.befriend(me, ok)
      await h.befriend(me, pending, 'PENDING')
      await h.befriend(me, blocked)
      await h.befriend(me, banned)
      await h.prisma.block.create({ data: { blockerId: me.id, blockedId: blocked.id } })
      await h.prisma.user.update({ where: { id: banned.id }, data: { status: 'BANNED' } })
      void stranger
      expect((await items(me)).map((i: { user: User }) => i.user.id)).toEqual([ok.id])
    })

    it('online dulu (label Web atau Mobile), lalu offline; nama terurut di tiap kelompok; belum dibaca', async () => {
      const me = await h.mkUser('me')
      const [amy, ben, cal, dan] = await Promise.all(
        ['amy', 'ben', 'cal', 'dan'].map((n) => h.mkUser(n)),
      )
      for (const f of [amy!, ben!, cal!, dan!]) await h.befriend(me, f)
      await connectAs(dan!) // WEB
      await connectAs(ben!, 'mobile') // MOBILE saja
      await connectAs(cal!, 'mobile')
      await connectAs(cal!) // web + mobile: WEB
      await send(amy!, me, 'a1')
      await send(amy!, me, 'a2')

      const list = await items(me)
      expect(
        list.map((i: { user: User; client: string | null }) => [i.user.displayName, i.client]),
      ).toEqual([
        ['ben', 'MOBILE'],
        ['cal', 'WEB'],
        ['dan', 'WEB'],
        ['amy', null],
      ])
      expect(list.map((i: { online: boolean }) => i.online)).toEqual([true, true, true, false])
      expect(list.find((i: { user: User }) => i.user.id === amy!.id).unreadCount).toBe(2)
      expect(list.find((i: { user: User }) => i.user.id === ben!.id).unreadCount).toBe(0)
    })

    it('offline setelah koneksi terakhir putus; payload presence membawa label klien', async () => {
      const { a, b } = await pair()
      const sb = await connect(b)
      const presence = next<{ userId: number; online: boolean; client?: string }>(sb, 'presence')
      const sa = await connectAs(a, 'mobile')
      expect(await presence).toEqual({ userId: a.id, online: true, client: 'MOBILE' })
      expect((await items(b))[0]).toMatchObject({ online: true, client: 'MOBILE' })
      const off = next(sb, 'presence')
      sa.close()
      await off
      expect((await items(b))[0]).toMatchObject({ online: false, client: null })
    })
  })

  describe('realtime', () => {
    it('REST: penerima dan tab lain pengirim mendapat message:new', async () => {
      const { a, b } = await pair()
      const sb = await connect(b)
      const sa2 = await connect(a)
      const gotB = next<{ content: string }>(sb, 'message:new')
      const gotA = next<{ content: string }>(sa2, 'message:new')
      await send(a, b, 'halo')
      expect((await gotB).content).toBe('halo')
      expect((await gotA).content).toBe('halo')
    })

    it('socket message:send: ack berisi pesan, penerima menerima message:new', async () => {
      const { a, b } = await pair()
      const sa = await connect(a)
      const sb = await connect(b)
      const got = next<{ content: string; senderId: number }>(sb, 'message:new')
      const ack = await emitAck<{ ok: boolean; message: { id: number; content: string } }>(
        sa,
        'message:send',
        {
          toUserId: b.id,
          content: 'via socket',
          clientId: 'k1',
        },
      )
      expect(ack.ok).toBe(true)
      expect(ack.message.content).toBe('via socket')
      expect(await got).toMatchObject({ content: 'via socket', senderId: a.id })
      expect(await h.prisma.message.count()).toBe(1)
    })

    it('socket dan REST berbagi idempotensi clientId', async () => {
      const { a, b } = await pair()
      const sa = await connect(a)
      const ack1 = await emitAck<{ message: { id: number } }>(sa, 'message:send', {
        toUserId: b.id,
        content: 'x',
        clientId: 'dup',
      })
      const rest = await send(a, b, 'x', 'dup')
      expect(rest.status).toBe(200)
      expect(rest.body.id).toBe(ack1.message.id)
      expect(await h.prisma.message.count()).toBe(1)
    })

    it.each([['bukan teman', 'NOT_FOUND']])(
      'socket ke %s: ack gagal %s, tanpa pesan dan tanpa event',
      async (_n, code) => {
        const a = await h.mkUser('a')
        const s = await h.mkUser('s')
        const sa = await connect(a)
        const ss = await connect(s)
        const quiet = silent(ss, 'message:new')
        const ack = await emitAck<{ ok: boolean; code: string }>(sa, 'message:send', {
          toUserId: s.id,
          content: 'x',
        })
        expect(ack).toMatchObject({ ok: false, code })
        expect(await quiet).toBe(true)
        expect(await h.prisma.message.count()).toBe(0)
      },
    )

    it('socket diblokir setelah terhubung: tetap ditolak (dicek per event)', async () => {
      const { a, b } = await pair()
      const sa = await connect(a)
      await h.prisma.block.create({ data: { blockerId: b.id, blockedId: a.id } })
      const ack = await emitAck<{ ok: boolean; code: string }>(sa, 'message:send', {
        toUserId: b.id,
        content: 'x',
      })
      expect(ack).toMatchObject({ ok: false, code: 'NOT_FOUND' })
    })

    it.each([
      [{ toUserId: 'x', content: 'a' }],
      [{ toUserId: 1 }],
      [{ toUserId: 1, content: 'a', clientId: 'bad id' }],
      [null],
      ['teks'],
    ])('payload tidak valid %j: ack VALIDATION_FAILED', async (payload) => {
      const a = await h.mkUser('a')
      const sa = await connect(a)
      const ack = await emitAck<{ ok: boolean; code: string }>(sa, 'message:send', payload)
      expect(ack).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' })
    })

    it('isi kosong atau terlalu panjang lewat socket: ack VALIDATION_FAILED', async () => {
      const { a, b } = await pair()
      const sa = await connect(a)
      for (const content of ['  ', 'x'.repeat(2001)]) {
        const ack = await emitAck<{ ok: boolean; code: string }>(sa, 'message:send', {
          toUserId: b.id,
          content,
        })
        expect(ack).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' })
      }
    })

    describe('typing (CHT-04)', () => {
      const typing = (s: Socket, toUserId: unknown, isTyping: unknown) =>
        s.emit('typing', { toUserId, isTyping })

      it('diteruskan ke teman dengan userId pengirim; pengirim sendiri tidak menerimanya', async () => {
        const { a, b } = await pair()
        const sa = await connect(a)
        const sa2 = await connect(a)
        const sb = await connect(b)
        const got = next<{ userId: number; isTyping: boolean }>(sb, 'typing')
        const own = silent(sa2, 'typing')
        typing(sa, b.id, true)
        expect(await got).toEqual({ userId: a.id, isTyping: true })
        expect(await own).toBe(true)
      })

      it('true dibatasi satu per detik; false selalu diteruskan', async () => {
        const { a, b } = await pair()
        const sa = await connect(a)
        const sb = await connect(b)
        const events: boolean[] = []
        sb.on('typing', (p: { isTyping: boolean }) => events.push(p.isTyping))
        for (let i = 0; i < 5; i++) typing(sa, b.id, true)
        await new Promise((r) => setTimeout(r, 300))
        expect(events).toEqual([true])
        typing(sa, b.id, false)
        await new Promise((r) => setTimeout(r, 200))
        expect(events).toEqual([true, false])
        typing(sa, b.id, true) // setelah false, batas direset
        await new Promise((r) => setTimeout(r, 200))
        expect(events).toEqual([true, false, true])
      })

      it.each([
        ['bukan teman', async () => void (await h.prisma.friendship.deleteMany())],
        [
          'diblokir',
          async (a: User, b: User) =>
            void (await h.prisma.block.create({ data: { blockerId: b.id, blockedId: a.id } })),
        ],
      ])('%s: diam, tidak ada event dan tidak ada galat', async (_n, setup) => {
        const { a, b } = await pair()
        await setup(a, b)
        const sa = await connect(a)
        const sb = await connect(b)
        const quiet = silent(sb, 'typing')
        typing(sa, b.id, true)
        expect(await quiet).toBe(true)
      })

      it('payload tidak valid diabaikan tanpa memutus koneksi', async () => {
        const { a, b } = await pair()
        const sa = await connect(a)
        const sb = await connect(b)
        const quiet = silent(sb, 'typing')
        typing(sa, 'x', true)
        typing(sa, b.id, 'ya')
        typing(sa, 0, true)
        sa.emit('typing', null)
        sa.emit('typing', 'teks')
        expect(await quiet).toBe(true)
        const got = next(sb, 'typing')
        typing(sa, b.id, true) // masih berfungsi
        await got
        expect(sa.connected).toBe(true)
      })

      it('diblokir setelah terhubung: dicek per event', async () => {
        const { a, b } = await pair()
        const sa = await connect(a)
        const sb = await connect(b)
        const first = next(sb, 'typing')
        typing(sa, b.id, true)
        await first
        await h.prisma.block.create({ data: { blockerId: b.id, blockedId: a.id } })
        const quiet = silent(sb, 'typing')
        typing(sa, b.id, false)
        expect(await quiet).toBe(true)
      })
    })

    it('message:read (socket dan REST): pengirim mendapat message:read dengan upToMessageId', async () => {
      const { a, b } = await pair()
      const sa = await connect(a)
      const sb = await connect(b)
      const m1 = (await send(a, b, '1')).body.id
      const m2 = (await send(a, b, '2')).body.id
      const got = next<{ byUserId: number; upToMessageId: number }>(sa, 'message:read')
      const ack = await emitAck<{ ok: boolean; updated: number }>(sb, 'message:read', {
        fromUserId: a.id,
      })
      expect(ack).toEqual({ ok: true, updated: 2 })
      expect(await got).toEqual({ byUserId: b.id, upToMessageId: Math.max(m1, m2) })

      const quiet = silent(sa, 'message:read')
      await h.as(b).post(`/messages/${a.id}/read`) // tidak ada yang baru: tanpa event
      expect(await quiet).toBe(true)
    })
  })
})
