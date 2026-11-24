// Tes integrasi ke MySQL uji + folder unggahan sementara (PRF-02, PRF-03).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'rb-me-'))

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'
import { MAX_IMAGE_BYTES } from '../uploads/image-type'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9])

describe('Edit profil dan foto (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  const dir = process.env.UPLOAD_DIR!

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
    rmSync(dir, { recursive: true, force: true })
  })

  describe('PATCH /me', () => {
    const all = {
      displayName: '  Ashlyn Taylor  ',
      bio: 'Suka ski',
      birthday: '1995-08-30',
      hometown: 'London',
      currentCity: 'Bristol',
      workplace: 'Toko Buku',
      school: 'UWE',
    }

    it('mengubah semua field, memangkas spasi, dan mengembalikan Profile (relationship SELF)', async () => {
      const me = await h.mkUser('me')
      const res = await h.as(me).patch('/me').send(all)
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        id: me.id,
        username: me.username,
        displayName: 'Ashlyn Taylor',
        bio: 'Suka ski',
        birthday: '1995-08-30',
        hometown: 'London',
        currentCity: 'Bristol',
        workplace: 'Toko Buku',
        school: 'UWE',
        relationship: 'SELF',
      })
      for (const secret of ['email', 'passwordHash', 'role', 'status'])
        expect(res.body[secret]).toBeUndefined()
      const row = await h.prisma.user.findUniqueOrThrow({ where: { id: me.id } })
      expect(row.displayName).toBe('Ashlyn Taylor')
      expect(row.birthday?.toISOString()).toBe('1995-08-30T00:00:00.000Z')
    })

    it('hanya field yang dikirim yang berubah', async () => {
      const me = await h.mkUser('me', { bio: 'lama', hometown: 'Solo', displayName: 'Nama Lama' })
      const res = await h.as(me).patch('/me').send({ workplace: 'Kantor' })
      expect(res.body).toMatchObject({
        bio: 'lama',
        hometown: 'Solo',
        displayName: 'Nama Lama',
        workplace: 'Kantor',
      })
    })

    it('null atau teks kosong mengosongkan kolom opsional', async () => {
      const me = await h.mkUser('me', {
        bio: 'x',
        hometown: 'a',
        currentCity: 'b',
        workplace: 'c',
        school: 'd',
        birthday: new Date('1990-01-01'),
      })
      const res = await h.as(me).patch('/me').send({
        bio: '',
        hometown: '   ',
        currentCity: null,
        workplace: null,
        school: null,
        birthday: null,
      })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        bio: null,
        hometown: null,
        currentCity: null,
        workplace: null,
        school: null,
        birthday: null,
      })
    })

    it('nama tidak boleh kosong; batas panjang dihormati (80, 80, 120, 2000)', async () => {
      const me = await h.mkUser('me')
      const send = (b: object) => h.as(me).patch('/me').send(b)
      expect((await send({ displayName: '' })).status).toBe(400)
      expect((await send({ displayName: '   ' })).status).toBe(400)
      expect((await send({ displayName: 'a'.repeat(81) })).status).toBe(400)
      expect((await send({ displayName: 'a'.repeat(80) })).status).toBe(200)
      expect((await send({ hometown: 'a'.repeat(81) })).status).toBe(400)
      expect((await send({ workplace: 'a'.repeat(121) })).status).toBe(400)
      expect((await send({ school: 'a'.repeat(121) })).status).toBe(400)
      expect((await send({ bio: 'a'.repeat(2001) })).status).toBe(400)
      expect((await send({ bio: 'a'.repeat(2000) })).status).toBe(200)
    })

    it.each([
      ['format salah', '30-08-1995'],
      ['bukan tanggal nyata', '1995-02-30'],
      ['bulan 13', '1995-13-01'],
      ['di masa depan', '2999-01-01'],
      ['sebelum 1900', '1899-12-31'],
      ['angka', 19950830],
    ])('tanggal lahir ditolak: %s', async (_n, birthday) => {
      const me = await h.mkUser('me')
      const res = await h.as(me).patch('/me').send({ birthday })
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('VALIDATION_FAILED')
    })

    it('field berbahaya ditolak (tidak bisa mengubah role, status, email, username, avatar, isBot)', async () => {
      const me = await h.mkUser('me')
      for (const body of [
        { role: 'ADMIN' },
        { status: 'ACTIVE' },
        { email: 'x@y.z' },
        { username: 'baru' },
        { avatarUrl: '/uploads/x.png' },
        { coverUrl: 'https://evil' },
        { isBot: true },
        { passwordHash: 'x' },
        { id: 1 },
      ]) {
        const res = await h.as(me).patch('/me').send(body)
        expect({ body, status: res.status }).toEqual({ body, status: 400 })
      }
      const row = await h.prisma.user.findUniqueOrThrow({ where: { id: me.id } })
      expect(row).toMatchObject({
        role: 'USER',
        username: me.username,
        email: me.email,
        isBot: false,
      })
    })

    it('hanya mengubah akun pemanggil; user lain tidak tersentuh', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b', { bio: 'bio b' })
      await h.as(a).patch('/me').send({ bio: 'bio a' })
      expect((await h.prisma.user.findUniqueOrThrow({ where: { id: b.id } })).bio).toBe('bio b')
    })

    it('terlihat di profil publik dan di penulis post', async () => {
      const me = await h.mkUser('me')
      const other = await h.mkUser('other')
      await h.prisma.post.create({ data: { authorId: me.id, content: 'x', privacy: 'PUBLIC' } })
      await h.as(me).patch('/me').send({ displayName: 'Nama Baru', bio: 'Bio baru' })
      expect((await h.as(other).get(`/users/${me.username}`)).body).toMatchObject({
        displayName: 'Nama Baru',
        bio: 'Bio baru',
      })
      expect(
        (await h.as(other).get(`/users/${me.username}/posts`)).body.items[0].author.displayName,
      ).toBe('Nama Baru')
    })

    it('tanpa login: 401; body kosong boleh (tidak ada perubahan)', async () => {
      const me = await h.mkUser('me')
      expect((await request(app.getHttpServer()).patch('/api/me').send({ bio: 'x' })).status).toBe(
        401,
      )
      expect((await h.as(me).patch('/me').send({})).status).toBe(200)
    })
  })

  describe.each([
    ['avatar', 'avatarUrl'],
    ['cover', 'coverUrl'],
  ] as const)('POST /me/%s (PRF-03)', (kind, field) => {
    const up = (
      u: Parameters<typeof h.as>[0],
      buf: Buffer,
      name = 'foto.png',
      type = 'image/png',
    ) => h.as(u).post(`/me/${kind}`).attach('file', buf, { filename: name, contentType: type })

    it('mengganti foto: Profile berisi URL baru; tampil di profil publik', async () => {
      const me = await h.mkUser('me')
      const other = await h.mkUser('other')
      const res = await up(me, PNG)
      expect(res.status).toBe(200)
      expect(res.body[field]).toMatch(/^\/uploads\/[0-9a-f]{32}\.png$/)
      expect(res.body.relationship).toBe('SELF')
      expect((await h.as(other).get(`/users/${me.username}`)).body[field]).toBe(res.body[field])
    })

    it('foto lama tetap tersimpan di disk setelah diganti', async () => {
      const me = await h.mkUser('me')
      const first = (await up(me, PNG)).body[field] as string
      const second = (await up(me, JPEG, 'b.jpg', 'image/jpeg')).body[field] as string
      expect(second).not.toBe(first)
      expect(second).toMatch(/\.jpg$/)
      const files = readdirSync(dir)
      expect(files).toContain(first.replace('/uploads/', ''))
      expect(files).toContain(second.replace('/uploads/', ''))
    })

    it('bukan gambar: 415 dan URL tidak berubah; terlalu besar: 413; tanpa berkas: 400; tanpa login: 401', async () => {
      const me = await h.mkUser('me')
      const bad = await up(me, Buffer.from('MZ' + 'x'.repeat(50)), 'virus.png', 'image/png')
      expect(bad.status).toBe(415)
      const big = await up(me, Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)]))
      expect(big.status).toBe(413)
      expect((await h.as(me).post(`/me/${kind}`).send({})).status).toBe(400)
      expect((await h.prisma.user.findUniqueOrThrow({ where: { id: me.id } }))[field]).toBeNull()
      const anon = await request(app.getHttpServer())
        .post(`/api/me/${kind}`)
        .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
      expect(anon.status).toBe(401)
    })

    it('hanya mengubah akun pemanggil', async () => {
      const a = await h.mkUser('a')
      const b = await h.mkUser('b')
      await up(a, PNG)
      expect((await h.prisma.user.findUniqueOrThrow({ where: { id: b.id } }))[field]).toBeNull()
    })
  })

  it('login dan register mengembalikan avatarUrl untuk sesi (navbar)', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'sesi@example.com',
      username: 'sesi_user',
      displayName: 'Sesi',
      password: 'password123',
    })
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      username: 'sesi_user',
      displayName: 'Sesi',
      avatarUrl: null,
    })
  })
})
