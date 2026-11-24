import type { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { User } from '@prisma/client'
import request from 'supertest'
import { PrismaService } from '../prisma/prisma.service'

/** Pembantu tes integrasi: buat user langsung di DB uji, token tanpa login, request terautentikasi. */
export function testHelpers(app: INestApplication) {
  const prisma = app.get(PrismaService)
  const jwt = app.get(JwtService)
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
  const as = (u: User) => {
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${tokenOf(u)}`)
    const http = () => request(app.getHttpServer())
    return {
      get: (p: string) => auth(http().get(`/api${p}`)),
      post: (p: string) => auth(http().post(`/api${p}`)),
      put: (p: string) => auth(http().put(`/api${p}`)),
      patch: (p: string) => auth(http().patch(`/api${p}`)),
      del: (p: string) => auth(http().delete(`/api${p}`)),
    }
  }
  const befriend = (a: User, b: User, status: 'ACCEPTED' | 'PENDING' = 'ACCEPTED') =>
    prisma.friendship.create({
      data: {
        requesterId: a.id,
        addresseeId: b.id,
        pairLowId: Math.min(a.id, b.id),
        pairHighId: Math.max(a.id, b.id),
        status,
      },
    })
  return { prisma, mkUser, tokenOf, as, befriend }
}
