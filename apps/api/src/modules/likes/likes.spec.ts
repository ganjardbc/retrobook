// Tes integrasi ke MySQL uji (INT-01, BR-13).
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
import { testHelpers, MISSING_ID } from '../../test/helpers'

describe('Like post (integrasi)', () => {
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

  it('like: 200 dengan jumlah dan likedByMe; diulang tetap satu baris (idempoten)', async () => {
    const { alice, post } = await mkPost()
    const bob = await h.mkUser('bob')
    const first = await h.as(bob).put(`/posts/${post.id}/like`)
    expect(first.status).toBe(200)
    expect(first.body).toEqual({ likeCount: 1, likedByMe: true })
    const again = await h.as(bob).put(`/posts/${post.id}/like`)
    expect(again.body).toEqual({ likeCount: 1, likedByMe: true })
    expect(await h.prisma.like.count({ where: { postId: post.id } })).toBe(1)
    // pembaca lain melihat jumlah yang sama tapi likedByMe false
    const view = await h.as(alice).put(`/posts/${post.id}/like`)
    expect(view.body).toEqual({ likeCount: 2, likedByMe: true })
  })

  it('like serentak dari user yang sama: tetap satu baris, tanpa 500', async () => {
    const { post } = await mkPost()
    const bob = await h.mkUser('bob')
    const results = await Promise.all(
      Array.from({ length: 6 }, () => h.as(bob).put(`/posts/${post.id}/like`)),
    )
    expect(results.map((r) => r.status)).toEqual(Array(6).fill(200))
    expect(await h.prisma.like.count({ where: { postId: post.id } })).toBe(1)
  })

  it('unlike menghapus baris; diulang tetap aman', async () => {
    const { post } = await mkPost()
    const bob = await h.mkUser('bob')
    await h.as(bob).put(`/posts/${post.id}/like`)
    const out = await h.as(bob).del(`/posts/${post.id}/like`)
    expect(out.status).toBe(200)
    expect(out.body).toEqual({ likeCount: 0, likedByMe: false })
    expect((await h.as(bob).del(`/posts/${post.id}/like`)).body).toEqual({
      likeCount: 0,
      likedByMe: false,
    })
  })

  it('menyukai post sendiri boleh', async () => {
    const { alice, post } = await mkPost()
    expect((await h.as(alice).put(`/posts/${post.id}/like`)).body.likeCount).toBe(1)
  })

  it('like hanya pada post yang terlihat; 404 sama dengan post tidak ada', async () => {
    const { alice, post } = await mkPost('FRIENDS')
    const stranger = await h.mkUser('stranger')
    const hidden = await h.as(stranger).put(`/posts/${post.id}/like`)
    const missing = await h.as(stranger).put(`/posts/${MISSING_ID}/like`)
    expect(hidden.status).toBe(404)
    expect(hidden.body).toEqual(missing.body)
    expect(await h.prisma.like.count()).toBe(0)
    expect((await h.as(stranger).del(`/posts/${post.id}/like`)).status).toBe(404)
    expect((await h.as(stranger).get(`/posts/${post.id}/likes`)).status).toBe(404)
    // setelah berteman, boleh
    await h.befriend(alice, stranger)
    expect((await h.as(stranger).put(`/posts/${post.id}/like`)).status).toBe(200)
  })

  it('post terhapus dan hidden tidak bisa disukai', async () => {
    const { alice, post } = await mkPost()
    const bob = await h.mkUser('bob')
    await h.prisma.post.update({ where: { id: post.id }, data: { hidden: true } })
    expect((await h.as(bob).put(`/posts/${post.id}/like`)).status).toBe(404)
    await h.prisma.post.update({
      where: { id: post.id },
      data: { hidden: false, deletedAt: new Date() },
    })
    expect((await h.as(alice).put(`/posts/${post.id}/like`)).status).toBe(404)
  })

  it('tanpa login: 401; id bukan angka: 400', async () => {
    const { post } = await mkPost()
    expect((await request(app.getHttpServer()).put(`/api/posts/${post.id}/like`)).status).toBe(401)
    const bob = await h.mkUser('bob')
    expect((await h.as(bob).put('/posts/abc/like')).status).toBe(400)
  })

  it('penyuka BANNED atau terhapus tidak dihitung dan tidak ditampilkan (BR-05)', async () => {
    const { alice, post } = await mkPost()
    const bob = await h.mkUser('bob')
    const banned = await h.mkUser('banned')
    const gone = await h.mkUser('gone')
    for (const u of [bob, banned, gone])
      await h.prisma.like.create({ data: { userId: u.id, postId: post.id } })
    await h.prisma.user.update({ where: { id: banned.id }, data: { status: 'BANNED' } })
    await h.prisma.user.update({ where: { id: gone.id }, data: { deletedAt: new Date() } })

    expect((await h.as(alice).put(`/posts/${post.id}/like`)).body.likeCount).toBe(2) // bob + alice
    const list = await h.as(alice).get(`/posts/${post.id}/likes`)
    expect(list.body.items.map((u: { username: string }) => u.username).sort()).toEqual(
      [alice.username, bob.username].sort(),
    )
    const detail = await h.as(alice).get(`/posts/${post.id}`)
    expect(detail.body.likeCount).toBe(2)
    expect(detail.body.likedPreview.map((u: { id: string }) => u.id)).not.toContain(banned.id)
  })

  it('daftar penyuka: terbaru dulu, kursor, tanpa data sensitif', async () => {
    const { alice, post } = await mkPost()
    const users = []
    for (let i = 0; i < 5; i++) {
      const u = await h.mkUser(`u${i}`)
      users.push(u)
      await h.prisma.like.create({ data: { userId: u.id, postId: post.id } })
    }
    const p1 = (await h.as(alice).get(`/posts/${post.id}/likes?limit=2`)).body
    expect(p1.items.map((u: { id: string }) => u.id)).toEqual([users[4]!.id, users[3]!.id])
    expect(p1.items[0].email).toBeUndefined()
    expect(p1.items[0].passwordHash).toBeUndefined()
    const p2 = (await h.as(alice).get(`/posts/${post.id}/likes?limit=2&cursor=${p1.nextCursor}`))
      .body
    expect(p2.items.map((u: { id: string }) => u.id)).toEqual([users[2]!.id, users[1]!.id])
    const p3 = (await h.as(alice).get(`/posts/${post.id}/likes?limit=2&cursor=${p2.nextCursor}`))
      .body
    expect(p3.items.map((u: { id: string }) => u.id)).toEqual([users[0]!.id])
    expect(p3.nextCursor).toBeNull()
  })

  it('feed dan detail post mencerminkan like: jumlah, likedByMe, pratinjau terbaru', async () => {
    const { alice, post } = await mkPost()
    const bob = await h.mkUser('bob')
    const carol = await h.mkUser('carol')
    await h.as(bob).put(`/posts/${post.id}/like`)
    await h.as(carol).put(`/posts/${post.id}/like`)
    const asBob = (await h.as(bob).get(`/posts/${post.id}`)).body
    expect(asBob).toMatchObject({ likeCount: 2, likedByMe: true })
    expect(asBob.likedPreview.map((u: { id: string }) => u.id)).toEqual([carol.id, bob.id])
    const asAlice = (await h.as(alice).get(`/posts/${post.id}`)).body
    expect(asAlice.likedByMe).toBe(false)
    await h.as(bob).del(`/posts/${post.id}/like`)
    expect((await h.as(bob).get('/feed')).body.items).toEqual([]) // bob bukan teman alice: tidak ada di feed
    expect((await h.as(alice).get('/feed')).body.items[0]).toMatchObject({
      likeCount: 1,
      likedByMe: false,
    })
  })
})
