import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { BotTextProvider } from './bot-text.provider'
import { OLDEST_FIRST } from '../../common/keyset'

const DAY_MS = 86_400_000
const MAX_REPLIES_PER_TICK = 5

/**
 * BOT-01, BR-09: bot menerima permintaan pertemanan, memposting sesuai frekuensi, dan membalas komentar
 * baru di postnya. Bot tidak bisa login; kontennya melewati filter visibilitas yang sama seperti user.
 */
@Injectable()
export class BotsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(BotsService.name)
  private timer?: NodeJS.Timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly text: BotTextProvider,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    // Tes dan e2e tidak memakai pewaktu; set BOTS_DISABLED=true untuk mematikan di lingkungan lain.
    if (process.env.NODE_ENV === 'test' || process.env.BOTS_DISABLED === 'true') return
    const seconds = Number(process.env.BOT_TICK_SECONDS) || 60
    this.timer = setInterval(
      () => void this.tick().catch((e) => this.log.warn(`tick gagal: ${String(e)}`)),
      seconds * 1000,
    )
    this.timer.unref()
  }

  onModuleDestroy() {
    clearInterval(this.timer)
  }

  /** Satu putaran untuk semua bot aktif. `now` bisa disuntikkan untuk tes. */
  async tick(now = new Date()): Promise<{ posts: number; replies: number; accepted: number }> {
    const bots = await this.prisma.botProfile.findMany({
      where: { active: true, user: { isBot: true, deletedAt: null, status: 'ACTIVE' } },
    })
    const total = { posts: 0, replies: 0, accepted: 0 }
    for (const bot of bots) {
      total.accepted += await this.acceptRequests(bot.userId)
      total.replies += await this.replyToComments(bot, now)
      total.posts += await this.postIfDue(bot, now)
      await this.prisma.botProfile.update({
        where: { userId: bot.userId },
        data: { lastTickAt: now },
      })
    }
    return total
  }

  private async acceptRequests(botId: number): Promise<number> {
    const pending = await this.prisma.friendship.findMany({
      where: { addresseeId: botId, status: 'PENDING' },
    })
    for (const f of pending) {
      const { count } = await this.prisma.friendship.updateMany({
        where: { id: f.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      })
      if (count)
        await this.notifications.notify({
          userId: f.requesterId,
          actorId: botId,
          type: 'FRIEND_ACCEPT',
        })
    }
    return pending.length
  }

  private async postIfDue(
    bot: {
      userId: number
      persona: string
      postsPerDay: number
      lastPostAt: Date | null
      createdAt: Date
    },
    now: Date,
  ): Promise<number> {
    const interval = DAY_MS / Math.max(1, bot.postsPerDay)
    const last = bot.lastPostAt ?? bot.createdAt
    if (now.getTime() - last.getTime() < interval) return 0
    const content = await this.text.post(bot.persona)
    await this.prisma.post.create({
      data: { authorId: bot.userId, content, privacy: 'PUBLIC', createdAt: now },
    })
    await this.prisma.botProfile.update({
      where: { userId: bot.userId },
      data: { lastPostAt: now },
    })
    return 1
  }

  private async replyToComments(
    bot: { userId: number; persona: string; lastTickAt: Date | null; createdAt: Date },
    now: Date,
  ): Promise<number> {
    const since = bot.lastTickAt ?? bot.createdAt
    const comments = await this.prisma.comment.findMany({
      where: {
        createdAt: { gt: since, lte: now },
        deletedAt: null,
        hidden: false,
        authorId: { not: bot.userId },
        author: { isBot: false, deletedAt: null, status: 'ACTIVE' },
        post: { authorId: bot.userId, deletedAt: null, hidden: false },
      },
      orderBy: OLDEST_FIRST,
      take: MAX_REPLIES_PER_TICK,
    })
    for (const c of comments) {
      const reply = await this.prisma.comment.create({
        data: {
          postId: c.postId,
          authorId: bot.userId,
          content: await this.text.reply(bot.persona, c.content),
        },
      })
      await this.notifications.notify({
        userId: c.authorId,
        actorId: bot.userId,
        type: 'COMMENT',
        postId: c.postId,
        commentId: reply.id,
      })
    }
    return comments.length
  }
}
