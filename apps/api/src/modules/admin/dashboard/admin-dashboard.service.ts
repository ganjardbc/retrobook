import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'

type DailyCountRow = { date: Date | string; count: bigint | number }

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const dateKey = (date: Date | string) =>
  typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10)

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const today = startOfUtcDay(new Date())
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)

    const [
      totalUsers,
      totalPosts,
      totalComments,
      activeUsersToday,
      newUsersLast7Days,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null, isBot: false } }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.comment.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, isBot: false, lastSeenAt: { gte: today, lt: tomorrow } },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, isBot: false, createdAt: { gte: sevenDaysAgo, lt: tomorrow } },
      }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
    ])

    return {
      totalUsers,
      totalPosts,
      totalComments,
      activeUsersToday,
      newUsersLast7Days,
      pendingReports,
    }
  }

  async series(days: number) {
    const today = startOfUtcDay(new Date())
    const start = new Date(today)
    start.setUTCDate(start.getUTCDate() - days + 1)
    const end = new Date(today)
    end.setUTCDate(end.getUTCDate() + 1)

    const [registrationRows, postRows] = await Promise.all([
      this.prisma.$queryRaw<DailyCountRow[]>`
        SELECT DATE(created_at) AS date, COUNT(*) AS count
        FROM users
        WHERE created_at >= ${start} AND created_at < ${end}
          AND deleted_at IS NULL AND is_bot = 0
        GROUP BY DATE(created_at)
      `,
      this.prisma.$queryRaw<DailyCountRow[]>`
        SELECT DATE(created_at) AS date, COUNT(*) AS count
        FROM posts
        WHERE created_at >= ${start} AND created_at < ${end} AND deleted_at IS NULL
        GROUP BY DATE(created_at)
      `,
    ])

    const fillDays = (rows: DailyCountRow[]) => {
      const counts = new Map(rows.map((row) => [dateKey(row.date), Number(row.count)]))
      return Array.from({ length: days }, (_, index) => {
        const date = new Date(start)
        date.setUTCDate(start.getUTCDate() + index)
        const key = date.toISOString().slice(0, 10)
        return { date: key, count: counts.get(key) ?? 0 }
      })
    }

    return { registrationsByDay: fillDays(registrationRows), postsByDay: fillDays(postRows) }
  }
}
