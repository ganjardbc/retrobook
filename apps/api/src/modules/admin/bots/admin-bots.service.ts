import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import * as argon2 from 'argon2'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { AdminAuditService } from '../admin-audit.service'
import type { CreateBotDto, UpdateBotDto } from './admin-bots.dto'

const RESERVED = new Set([
  'admin',
  'api',
  'login',
  'register',
  'settings',
  'friends',
  'maintenance',
])
const select = {
  userId: true,
  persona: true,
  postsPerDay: true,
  active: true,
  lastPostAt: true,
  createdAt: true,
  user: { select: { username: true, displayName: true } },
} satisfies Prisma.BotProfileSelect

@Injectable()
export class AdminBotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list() {
    return { items: await this.prisma.botProfile.findMany({ orderBy: { userId: 'asc' }, select }) }
  }

  /** ADM-15: buat akun bot (isBot, tanpa login: kata sandi acak yang tidak diketahui siapa pun) beserta profilnya. */
  async create(adminId: string, dto: CreateBotDto, ip?: string) {
    if (RESERVED.has(dto.username.toLowerCase()))
      throw new AppException(409, 'USERNAME_TAKEN', 'Username is already taken')
    const passwordHash = await argon2.hash(randomBytes(32).toString('hex'))
    try {
      return await this.audit.execute(
        {
          adminId,
          action: 'BOT_CREATE',
          targetType: 'BOT',
          detail: { username: dto.username },
          ip,
        },
        async (tx) => {
          const user = await tx.user.create({
            data: {
              email: `${dto.username.toLowerCase()}@bots.retrobook.invalid`,
              username: dto.username,
              displayName: dto.displayName,
              passwordHash,
              isBot: true,
            },
            select: { id: true },
          })
          return tx.botProfile.create({
            data: { userId: user.id, persona: dto.persona, postsPerDay: dto.postsPerDay },
            select,
          })
        },
      )
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppException(409, 'USERNAME_TAKEN', 'Username is already taken')
      }
      throw e
    }
  }

  update(adminId: string, userId: string, dto: UpdateBotDto, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: 'BOT_UPDATE',
        targetType: 'BOT',
        targetId: userId,
        detail: { ...dto },
        ip,
      },
      async (tx) => {
        const updated = await tx.botProfile.updateMany({ where: { userId }, data: dto })
        if (!updated.count) throw new AppException(404, 'NOT_FOUND', 'Bot not found')
        return tx.botProfile.findUniqueOrThrow({ where: { userId }, select })
      },
    )
  }
}
