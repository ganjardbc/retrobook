process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL))
  throw new Error('TEST_DATABASE_URL harus berakhiran _test')

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as argon2 from 'argon2'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { PrismaService } from '../../prisma/prisma.service'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'
import { UsersService } from './users.service'

describe('Account deletion (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>
  let prisma: PrismaService
  let users: UsersService
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    h = testHelpers(app)
    prisma = app.get(PrismaService)
    users = app.get(UsersService)
  })
  beforeEach(() => resetDb(h.prisma))
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  it('requires the password, hides content immediately, revokes sessions, and anonymizes after 30 days', async () => {
    const user = await h.mkUser('owner', {
      passwordHash: await argon2.hash('secret'),
      bio: 'private bio',
    })
    const post = await prisma.post.create({ data: { authorId: user.id, content: 'hide me' } })
    const denied = await h.as(user).del('/me').send({ password: 'wrong' })
    expect(denied.status).toBe(403)
    const deleted = await h.as(user).del('/me').send({ password: 'secret' })
    expect(deleted.status).toBe(204)
    expect(
      (await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).deletedAt,
    ).not.toBeNull()
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt,
    ).not.toBeNull()
    expect((await h.as(user).get('/me/privacy')).status).toBe(401)

    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    })
    await users.anonymizeExpiredAccounts()
    const anonymous = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(anonymous).toMatchObject({
      username: `deleted-${user.id.replaceAll('-', '').slice(0, 20)}`,
      email: `deleted-${user.id}@invalid.local`,
      displayName: 'Deleted account',
      bio: null,
    })
  })
})
