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
import { Privacy, User } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { PrismaService } from '../../prisma/prisma.service'
import { resetDb } from '../../test/db'
import { pairOf } from '../friends/pair'
import { seqTime } from '../../test/helpers'

describe('Save dan On This Day (integrasi)', () => {
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
  const befriend = (a: User, b: User, status: 'ACCEPTED' | 'PENDING' = 'ACCEPTED') =>
    prisma.friendship.create({
      data: {
        requesterId: a.id,
        addresseeId: b.id,
        ...pairOf(a.id, b.id),
        status,
      },
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

  describe('Save (SAV-01)', () => {
    it('simpan, tampil di /saved dengan savedByMe, idempoten, lalu batal simpan', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      await befriend(alice, bob)
      const post = await prisma.post.create({
        data: { authorId: alice.id, content: 'x', privacy: Privacy.FRIENDS },
      })
      expect((await api(bob).put(`/posts/${post.id}/save`)).body).toEqual({ savedByMe: true })
      await api(bob).put(`/posts/${post.id}/save`).expect(200)
      const list = await api(bob).get('/saved').expect(200)
      expect(list.body.items).toHaveLength(1)
      expect(list.body.items[0]).toMatchObject({ id: post.id, savedByMe: true })
      expect((await api(alice).get('/saved')).body.items).toHaveLength(0)
      expect((await api(bob).del(`/posts/${post.id}/save`)).body).toEqual({ savedByMe: false })
      expect((await api(bob).get('/saved')).body.items).toHaveLength(0)
    })

    it('urut menurut waktu simpan (bukan waktu post), kursor menelusuri tanpa duplikat', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const at = seqTime()
      // Waktu post berlawanan dengan waktu simpan: p1 paling baru dibuat tetapi paling dulu disimpan.
      const p1 = await prisma.post.create({
        data: { authorId: alice.id, content: 'p1', privacy: Privacy.PUBLIC, createdAt: at() },
      })
      const p2 = await prisma.post.create({
        data: { authorId: alice.id, content: 'p2', privacy: Privacy.PUBLIC, createdAt: at() },
      })
      const p3 = await prisma.post.create({
        data: { authorId: alice.id, content: 'p3', privacy: Privacy.PUBLIC, createdAt: at() },
      })
      const savedAt = seqTime(Date.now() - 600_000)
      for (const p of [p3, p1, p2]) {
        await prisma.savedPost.create({
          data: { userId: bob.id, postId: p.id, createdAt: savedAt() },
        })
      }
      const first = (await api(bob).get('/saved?limit=2')).body
      expect(first.items.map((i: { content: string }) => i.content)).toEqual(['p2', 'p1'])
      expect(first.nextCursor).toBe(p1.id)
      const second = (await api(bob).get(`/saved?limit=2&cursor=${first.nextCursor}`)).body
      expect(second.items.map((i: { content: string }) => i.content)).toEqual(['p3'])
      expect(second.nextCursor).toBeNull()
    })

    it('simpan ulang menaikkan post ke atas daftar', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const a = await prisma.post.create({
        data: { authorId: alice.id, content: 'a', privacy: Privacy.PUBLIC },
      })
      const b = await prisma.post.create({
        data: { authorId: alice.id, content: 'b', privacy: Privacy.PUBLIC },
      })
      const old = seqTime(Date.now() - 600_000)
      for (const p of [a, b]) {
        await prisma.savedPost.create({ data: { userId: bob.id, postId: p.id, createdAt: old() } })
      }
      const order = async () =>
        (await api(bob).get('/saved')).body.items.map((i: { content: string }) => i.content)
      expect(await order()).toEqual(['b', 'a'])
      await api(bob).put(`/posts/${a.id}/save`).expect(200)
      expect(await order()).toEqual(['a', 'b'])
      expect(await prisma.savedPost.count({ where: { userId: bob.id } })).toBe(2) // tidak menggandakan
    })

    it('post yang tak boleh dilihat: 404; simpanan yang kemudian jadi privat tersaring', async () => {
      const alice = await mkUser('alice')
      const bob = await mkUser('bob')
      const priv = await prisma.post.create({
        data: { authorId: alice.id, content: 'x', privacy: Privacy.ONLY_ME },
      })
      await api(bob).put(`/posts/${priv.id}/save`).expect(404)
      const pub = await prisma.post.create({
        data: { authorId: alice.id, content: 'y', privacy: Privacy.PUBLIC },
      })
      await api(bob).put(`/posts/${pub.id}/save`).expect(200)
      await prisma.post.update({ where: { id: pub.id }, data: { privacy: Privacy.ONLY_ME } })
      expect((await api(bob).get('/saved')).body.items).toHaveLength(0)
    })
  })

  describe('On This Day (OTD-01)', () => {
    it('hanya post sendiri di hari dan bulan yang sama pada tahun lalu', async () => {
      const alice = await mkUser('alice')
      const now = new Date()
      const at = (yearsAgo: number, dayShift = 0) =>
        new Date(
          Date.UTC(
            now.getUTCFullYear() - yearsAgo,
            now.getUTCMonth(),
            now.getUTCDate() + dayShift,
            12,
          ),
        )
      const mk = (content: string, createdAt: Date) =>
        prisma.post.create({
          data: { authorId: alice.id, content, createdAt, privacy: Privacy.ONLY_ME },
        })
      await mk('setahun', at(1))
      await mk('dua tahun', at(2))
      await mk('besok', at(1, 1))
      await mk('hari ini', at(0))
      const res = await api(alice).get('/on-this-day').expect(200)
      expect(res.body.items.map((p: { content: string }) => p.content).sort()).toEqual(
        ['dua tahun', 'setahun'].sort(),
      )
    })

    it('post terhapus tidak muncul', async () => {
      const alice = await mkUser('alice')
      const d = new Date()
      await prisma.post.create({
        data: {
          authorId: alice.id,
          content: 'x',
          deletedAt: new Date(),
          createdAt: new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate(), 1)),
        },
      })
      expect((await api(alice).get('/on-this-day')).body.items).toHaveLength(0)
    })
  })
})
