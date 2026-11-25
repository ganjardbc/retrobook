process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('GET /posts/:id/related (integrasi)', () => {
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

  const post = async (u: Awaited<ReturnType<typeof h.mkUser>>, content: string, privacy: string) =>
    (await h.as(u).post('/posts').send({ content, privacy })).body

  it('memuat post lain penulis dan post terbaru, tanpa membocorkan yang tak terlihat', async () => {
    const a = await h.mkUser('a')
    const b = await h.mkUser('b')
    const main = await post(a, 'utama', 'PUBLIC')
    const other = await post(a, 'lain', 'PUBLIC')
    const secret = await post(a, 'rahasia', 'ONLY_ME')
    const bPost = await post(b, 'punya b', 'PUBLIC')

    const res = await h.as(b).get(`/posts/${main.id}/related`)
    expect(res.status).toBe(200)
    const ids = res.body.map((p: { id: string }) => p.id)
    expect(ids).toContain(other.id)
    expect(ids).toContain(bPost.id)
    expect(ids).not.toContain(main.id)
    expect(ids).not.toContain(secret.id)
    expect((await h.as(b).get(`/posts/${secret.id}/related`)).status).toBe(404)
  })
})
