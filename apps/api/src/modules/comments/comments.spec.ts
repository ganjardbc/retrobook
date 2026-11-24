// Tes integrasi ke MySQL uji (INT-02, POST-06, BR-05, BR-07).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Komentar (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>

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
  })

  const mkPost = async (privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME' = 'PUBLIC') => {
    const alice = await h.mkUser('alice')
    const post = await h.prisma.post.create({ data: { authorId: alice.id, content: 'x', privacy } })
    return { alice, post }
  }

  describe('buat (POST /posts/:id/comments)', () => {
    it('berhasil: 201, bentuk objek sesuai kontrak, tanpa data sensitif', async () => {
      const { post } = await mkPost()
      const bob = await h.mkUser('bob')
      const res = await h.as(bob).post(`/posts/${post.id}/comments`).send({ content: 'Mantap' })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        postId: post.id,
        content: 'Mantap',
        imageUrl: null,
        likeCount: 0,
        likedByMe: false,
        author: { id: bob.id, username: bob.username, isBot: false },
      })
      expect(res.body.author.email).toBeUndefined()
      expect(res.body.createdAt).toEqual(expect.any(String))
    })

    it('2.000 karakter lolos, 2.001 ditolak; kosong dan spasi saja ditolak; field asing ditolak', async () => {
      const { post } = await mkPost()
      const bob = await h.mkUser('bob')
      const send = (body: object) => h.as(bob).post(`/posts/${post.id}/comments`).send(body)
      expect((await send({ content: 'a'.repeat(2000) })).status).toBe(201)
      expect((await send({ content: 'a'.repeat(2001) })).status).toBe(400)
      expect((await send({ content: '' })).status).toBe(400)
      expect((await send({ content: '  \n ' })).status).toBe(400)
      expect((await send({})).status).toBe(400)
      expect((await send({ content: 'x', authorId: 1 })).status).toBe(400)
      expect((await send({ content: 'x', postId: 5 })).status).toBe(400)
    })

    it('hanya pada post yang terlihat; 404 sama dengan post tidak ada; tidak ada baris tersimpan', async () => {
      const { alice, post } = await mkPost('FRIENDS')
      const stranger = await h.mkUser('stranger')
      const hidden = await h
        .as(stranger)
        .post(`/posts/${post.id}/comments`)
        .send({ content: 'hai' })
      const missing = await h.as(stranger).post('/posts/999999/comments').send({ content: 'hai' })
      expect(hidden.status).toBe(404)
      expect(hidden.body).toEqual(missing.body)
      expect(await h.prisma.comment.count()).toBe(0)
      await h.befriend(alice, stranger)
      expect(
        (await h.as(stranger).post(`/posts/${post.id}/comments`).send({ content: 'hai' })).status,
      ).toBe(201)
    })

    it('post terhapus atau hidden tidak bisa dikomentari', async () => {
      const { post } = await mkPost()
      const bob = await h.mkUser('bob')
      await h.prisma.post.update({ where: { id: post.id }, data: { hidden: true } })
      expect(
        (await h.as(bob).post(`/posts/${post.id}/comments`).send({ content: 'x' })).status,
      ).toBe(404)
      await h.prisma.post.update({
        where: { id: post.id },
        data: { hidden: false, deletedAt: new Date() },
      })
      expect(
        (await h.as(bob).post(`/posts/${post.id}/comments`).send({ content: 'x' })).status,
      ).toBe(404)
    })

    it('tanpa login: 401', async () => {
      const { post } = await mkPost()
      expect(
        (
          await request(app.getHttpServer())
            .post(`/api/posts/${post.id}/comments`)
            .send({ content: 'x' })
        ).status,
      ).toBe(401)
    })
  })

  describe('daftar (GET /posts/:id/comments)', () => {
    it('urut lama ke baru dengan kursor, tanpa duplikat', async () => {
      const { alice, post } = await mkPost()
      for (let i = 1; i <= 25; i++) {
        await h.prisma.comment.create({
          data: { postId: post.id, authorId: alice.id, content: `c${i}` },
        })
      }
      const p1 = (await h.as(alice).get(`/posts/${post.id}/comments`)).body
      expect(p1.items.map((c: { content: string }) => c.content)).toEqual(
        Array.from({ length: 10 }, (_, i) => `c${i + 1}`),
      )
      expect(p1.nextCursor).toBe(p1.items[9].id)
      const p2 = (await h.as(alice).get(`/posts/${post.id}/comments?cursor=${p1.nextCursor}`)).body
      expect(p2.items[0].content).toBe('c11')
      const p3 = (await h.as(alice).get(`/posts/${post.id}/comments?cursor=${p2.nextCursor}`)).body
      expect(p3.items.map((c: { content: string }) => c.content)).toEqual([
        'c21',
        'c22',
        'c23',
        'c24',
        'c25',
      ])
      expect(p3.nextCursor).toBeNull()
    })

    it('komentar baru yang masuk saat paginasi tidak menggeser halaman berikutnya', async () => {
      const { alice, post } = await mkPost()
      for (let i = 1; i <= 12; i++) {
        await h.prisma.comment.create({
          data: { postId: post.id, authorId: alice.id, content: `c${i}` },
        })
      }
      const p1 = (await h.as(alice).get(`/posts/${post.id}/comments?limit=5`)).body
      await h.as(alice).post(`/posts/${post.id}/comments`).send({ content: 'baru' })
      const p2 = (
        await h.as(alice).get(`/posts/${post.id}/comments?limit=5&cursor=${p1.nextCursor}`)
      ).body
      expect(p2.items.map((c: { content: string }) => c.content)).toEqual([
        'c6',
        'c7',
        'c8',
        'c9',
        'c10',
      ])
    })

    it('hanya komentar yang boleh dilihat: terhapus, hidden orang lain, penulis BANNED/terhapus disembunyikan', async () => {
      const { alice, post } = await mkPost()
      const bob = await h.mkUser('bob')
      const banned = await h.mkUser('banned')
      const gone = await h.mkUser('gone')
      const mk = (authorId: number, content: string, extra = {}) =>
        h.prisma.comment.create({ data: { postId: post.id, authorId, content, ...extra } })
      await mk(alice.id, 'ok')
      await mk(alice.id, 'dihapus', { deletedAt: new Date() })
      await mk(bob.id, 'hidden-bob', { hidden: true })
      await mk(banned.id, 'dari-banned')
      await mk(gone.id, 'dari-terhapus')
      await h.prisma.user.update({ where: { id: banned.id }, data: { status: 'BANNED' } })
      await h.prisma.user.update({ where: { id: gone.id }, data: { deletedAt: new Date() } })

      const asAlice = (await h.as(alice).get(`/posts/${post.id}/comments`)).body.items
      expect(asAlice.map((c: { content: string }) => c.content)).toEqual(['ok'])
      // pemilik komentar tetap melihat komentarnya yang di-hidden admin (BR-07)
      const asBob = (await h.as(bob).get(`/posts/${post.id}/comments`)).body.items
      expect(asBob.map((c: { content: string }) => c.content)).toEqual(['ok', 'hidden-bob'])
    })

    it('post tak terlihat: 404; post yang dihapus menyembunyikan semua komentarnya (POST-06)', async () => {
      const { alice, post } = await mkPost('ONLY_ME')
      const bob = await h.mkUser('bob')
      await h.prisma.comment.create({
        data: { postId: post.id, authorId: alice.id, content: 'rahasia' },
      })
      expect((await h.as(bob).get(`/posts/${post.id}/comments`)).status).toBe(404)
      await h.prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } })
      expect((await h.as(alice).get(`/posts/${post.id}/comments`)).status).toBe(404)
    })

    it('limit dibatasi 1 sampai 50', async () => {
      const { alice, post } = await mkPost()
      expect((await h.as(alice).get(`/posts/${post.id}/comments?limit=51`)).status).toBe(400)
      expect((await h.as(alice).get(`/posts/${post.id}/comments?limit=0`)).status).toBe(400)
    })
  })

  describe('hapus (DELETE /comments/:id)', () => {
    const setup = async () => {
      const { alice, post } = await mkPost()
      const bob = await h.mkUser('bob')
      const carol = await h.mkUser('carol')
      const comment = await h.prisma.comment.create({
        data: { postId: post.id, authorId: bob.id, content: 'dari bob' },
      })
      return { alice, bob, carol, post, comment }
    }

    it('penulis komentar boleh menghapus (soft delete, 204)', async () => {
      const { bob, comment } = await setup()
      expect((await h.as(bob).del(`/comments/${comment.id}`)).status).toBe(204)
      expect(
        (await h.prisma.comment.findUniqueOrThrow({ where: { id: comment.id } })).deletedAt,
      ).not.toBeNull()
    })

    it('pemilik post boleh menghapus komentar orang lain', async () => {
      const { alice, comment } = await setup()
      expect((await h.as(alice).del(`/comments/${comment.id}`)).status).toBe(204)
    })

    it('orang lain yang bisa melihat: 403 dan komentar tetap ada', async () => {
      const { carol, comment } = await setup()
      const res = await h.as(carol).del(`/comments/${comment.id}`)
      expect(res.status).toBe(403)
      expect(
        (await h.prisma.comment.findUniqueOrThrow({ where: { id: comment.id } })).deletedAt,
      ).toBeNull()
    })

    it('komentar tidak ada, sudah dihapus, atau di post yang tidak terlihat: 404', async () => {
      const { alice, bob, post, comment } = await setup()
      expect((await h.as(alice).del('/comments/999999')).status).toBe(404)
      await h.as(bob).del(`/comments/${comment.id}`)
      expect((await h.as(bob).del(`/comments/${comment.id}`)).status).toBe(404)

      const other = await h.prisma.comment.create({
        data: { postId: post.id, authorId: bob.id, content: 'lagi' },
      })
      await h.prisma.post.update({ where: { id: post.id }, data: { privacy: 'ONLY_ME' } })
      expect((await h.as(bob).del(`/comments/${other.id}`)).status).toBe(404) // bob tak bisa melihat post lagi
    })

    it('tanpa login: 401; id bukan angka: 400', async () => {
      const { alice, comment } = await setup()
      expect(
        (await request(app.getHttpServer()).delete(`/api/comments/${comment.id}`)).status,
      ).toBe(401)
      expect((await h.as(alice).del('/comments/abc')).status).toBe(400)
    })
  })

  it('commentCount di post mengikuti aturan yang sama (komentar sendiri yang hidden ikut dihitung)', async () => {
    const { alice, post } = await mkPost()
    const bob = await h.mkUser('bob')
    const mk = (authorId: number, extra = {}) =>
      h.prisma.comment.create({ data: { postId: post.id, authorId, content: 'c', ...extra } })
    await mk(alice.id)
    await mk(bob.id, { hidden: true })
    await mk(bob.id, { deletedAt: new Date() })
    expect((await h.as(alice).get(`/posts/${post.id}`)).body.commentCount).toBe(1)
    expect((await h.as(bob).get(`/posts/${post.id}`)).body.commentCount).toBe(2)
    // setelah menambah lewat API, hitungan naik; setelah dihapus, turun
    const created = (await h.as(alice).post(`/posts/${post.id}/comments`).send({ content: 'baru' }))
      .body
    expect((await h.as(alice).get(`/posts/${post.id}`)).body.commentCount).toBe(2)
    await h.as(alice).del(`/comments/${created.id}`)
    expect((await h.as(alice).get(`/posts/${post.id}`)).body.commentCount).toBe(1)
  })
})
