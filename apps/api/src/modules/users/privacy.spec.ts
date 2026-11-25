process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Profile privacy (integrasi)', () => {
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

  it('hides info and friends when private, and applies the default privacy to new posts', async () => {
    const owner = await h.mkUser('owner', { bio: 'Rahasia', hometown: 'Bandung' })
    const friend = await h.mkUser('friend')
    const stranger = await h.mkUser('stranger')
    await h.befriend(owner, friend)
    const updated = await h.as(owner).patch('/me/privacy').send({
      profileInfoPrivacy: 'ONLY_ME',
      friendsPrivacy: 'ONLY_ME',
      defaultPostPrivacy: 'PUBLIC',
    })
    expect(updated.status).toBe(200)
    expect(updated.body).toEqual({
      profileInfoPrivacy: 'ONLY_ME',
      friendsPrivacy: 'ONLY_ME',
      defaultPostPrivacy: 'PUBLIC',
    })
    const profile = await h.as(stranger).get(`/users/${owner.username}`)
    expect(profile.body).toMatchObject({
      bio: null,
      hometown: null,
      friendCount: 0,
      profileInfoVisible: false,
      friendsVisible: false,
    })
    expect((await h.as(stranger).get(`/users/${owner.username}/friends`)).body).toMatchObject({
      items: [],
      total: 0,
    })
    expect((await h.as(owner).get(`/users/${owner.username}`)).body.bio).toBe('Rahasia')
    const post = await h.as(owner).post('/posts').send({ content: 'Post tanpa pilihan privasi' })
    expect(post.status).toBe(201)
    expect(post.body.privacy).toBe('PUBLIC')
  })
})
