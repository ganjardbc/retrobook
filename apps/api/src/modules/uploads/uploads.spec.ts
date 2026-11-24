// Tes integrasi ke MySQL uji + folder unggahan sementara.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { mkdtempSync, readdirSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'rb-uploads-'))

import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { PrismaService } from '../../prisma/prisma.service'
import { resetDb } from '../../test/db'
import { MAX_IMAGE_BYTES, detectImageExt } from './image-type'
import { serveUploads } from './serve-uploads'

const pad = (head: Buffer, total: number) =>
  Buffer.concat([head, Buffer.alloc(Math.max(0, total - head.length))])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([4, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
])
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100)])

describe('detectImageExt', () => {
  it('mengenali dari isi', () => {
    expect(detectImageExt(JPEG)).toBe('jpg')
    expect(detectImageExt(PNG)).toBe('png')
    expect(detectImageExt(WEBP)).toBe('webp')
  })
  it('menolak yang lain dan buffer terlalu pendek', () => {
    expect(detectImageExt(EXE)).toBeNull()
    expect(detectImageExt(Buffer.from('<svg/>'))).toBeNull()
    expect(detectImageExt(Buffer.alloc(0))).toBeNull()
    expect(detectImageExt(Buffer.from([0xff, 0xd8]))).toBeNull()
  })
})

describe('Upload gambar (integrasi)', () => {
  let app: NestExpressApplication
  let prisma: PrismaService
  let token: string
  const dir = process.env.UPLOAD_DIR!
  const upload = (buf: Buffer, filename: string, contentType: string, auth = true) => {
    const r = request(app.getHttpServer()).post('/api/uploads/post-image')
    if (auth) r.set('Authorization', `Bearer ${token}`)
    return r.attach('file', buf, { filename, contentType })
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication<NestExpressApplication>()
    configureApp(app)
    serveUploads(app)
    await app.init()
    prisma = app.get(PrismaService)
    await resetDb(prisma)
    const res = await request(app.getHttpServer()).post('/api/auth/register').send({
      email: 'up@example.com',
      username: 'uploader',
      displayName: 'Up',
      password: 'password123',
    })
    token = res.body.accessToken
  })
  afterAll(async () => {
    await resetDb(prisma)
    await app.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it.each([
    ['jpg', JPEG, 'image/jpeg'],
    ['png', PNG, 'image/png'],
    ['webp', WEBP, 'image/webp'],
  ])('%s lolos: 201, URL acak, berkas tersimpan', async (ext, buf, type) => {
    const res = await upload(buf, `foto.${ext}`, type)
    expect(res.status).toBe(201)
    expect(res.body.url).toMatch(new RegExp(`^/uploads/[0-9a-f]{32}\\.${ext}$`))
    expect(readdirSync(dir)).toContain(res.body.url.replace('/uploads/', ''))
  })

  it('ekstensi ditentukan dari isi, bukan dari nama klien', async () => {
    const res = await upload(PNG, 'ini-png.jpg', 'image/jpeg')
    expect(res.status).toBe(201)
    expect(res.body.url).toMatch(/\.png$/)
  })

  it('nama berkas dari klien (path traversal) tidak dipakai', async () => {
    const before = readdirSync(dir).length
    const res = await upload(JPEG, '../../../etc/evil.jpg', 'image/jpeg')
    expect(res.status).toBe(201)
    expect(res.body.url).not.toContain('evil')
    expect(readdirSync(dir)).toHaveLength(before + 1)
  })

  it('.exe bernama .jpg: 415', async () => {
    const res = await upload(EXE, 'virus.jpg', 'image/jpeg')
    expect(res.status).toBe(415)
    expect(res.body.code).toBe('UNSUPPORTED_MEDIA_TYPE')
  })

  it('SVG dan teks berkedok gambar: 415', async () => {
    expect(
      (await upload(Buffer.from('<svg onload="alert(1)"/>'), 'a.png', 'image/png')).status,
    ).toBe(415)
  })

  it('tepat 5 MB lolos, lebih satu byte: 413 FILE_TOO_LARGE', async () => {
    const ok = await upload(pad(JPEG, MAX_IMAGE_BYTES), 'besar.jpg', 'image/jpeg')
    expect(ok.status).toBe(201)
    const big = await upload(pad(JPEG, MAX_IMAGE_BYTES + 1), 'terlalu-besar.jpg', 'image/jpeg')
    expect(big.status).toBe(413)
    expect(big.body.code).toBe('FILE_TOO_LARGE')
  })

  it('tanpa login: 401 dan tidak ada berkas tersimpan', async () => {
    const before = readdirSync(dir).length
    const res = await upload(JPEG, 'a.jpg', 'image/jpeg', false)
    expect(res.status).toBe(401)
    expect(readdirSync(dir)).toHaveLength(before)
  })

  it('tanpa field file: 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/uploads/post-image')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_FAILED')
  })

  it('berkas kosong: 400', async () => {
    expect((await upload(Buffer.alloc(0), 'kosong.jpg', 'image/jpeg')).status).toBe(400)
  })

  it('field lain selain "file" ditolak', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/uploads/post-image')
      .set('Authorization', `Bearer ${token}`)
      .attach('lain', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(400)
  })

  it('berkas disajikan dengan tipe benar dan nosniff; direktori tidak bisa dilihat', async () => {
    const { body } = await upload(PNG, 'x.png', 'image/png')
    const file = await request(app.getHttpServer()).get(body.url)
    expect(file.status).toBe(200)
    expect(file.headers['content-type']).toMatch(/image\/png/)
    expect(file.headers['x-content-type-options']).toBe('nosniff')
    expect(
      Buffer.compare(file.body, readFileSync(join(dir, body.url.replace('/uploads/', '')))),
    ).toBe(0)
    expect((await request(app.getHttpServer()).get('/uploads/')).status).toBe(404)
    expect((await request(app.getHttpServer()).get('/uploads/tidak-ada.png')).status).toBe(404)
  })
})
