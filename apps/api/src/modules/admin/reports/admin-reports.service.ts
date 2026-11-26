import { Injectable } from '@nestjs/common'
import { Prisma, ReportTargetType, Role, UserStatus } from '@prisma/client'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { RealtimeGateway } from '../../realtime/realtime.gateway'
import { AdminAuditService } from '../admin-audit.service'
import {
  AdminReportAction,
  type AdminReportsQuery,
  type DecideReportDto,
} from './admin-reports.dto'

const author = { select: { id: true, username: true, displayName: true, avatarUrl: true } }
const userBrief = { id: true, username: true, displayName: true, avatarUrl: true, status: true }

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(query: AdminReportsQuery) {
    const where: Prisma.ReportWhereInput = query.status ? { status: query.status } : {}
    const rows = await this.prisma.report.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { reporter: { select: userBrief } },
    })
    const page = rows.slice(0, query.limit)
    const idsOf = (type: ReportTargetType) =>
      page.filter((r) => r.targetType === type).map((r) => r.targetId)
    const [posts, comments, users, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { id: { in: idsOf('POST') } },
        select: { id: true, content: true, imageUrl: true, hidden: true, deletedAt: true, author },
      }),
      this.prisma.comment.findMany({
        where: { id: { in: idsOf('COMMENT') } },
        select: { id: true, content: true, imageUrl: true, hidden: true, deletedAt: true, author },
      }),
      this.prisma.user.findMany({ where: { id: { in: idsOf('USER') } }, select: userBrief }),
      this.prisma.report.count({ where }),
    ])
    const previews = {
      POST: new Map(posts.map((p) => [p.id, p])),
      COMMENT: new Map(comments.map((c) => [c.id, c])),
      USER: new Map(users.map((u) => [u.id, u])),
    }
    return {
      items: page.map((r) => ({
        ...r,
        target: previews[r.targetType].get(r.targetId) ?? null,
      })),
      total,
      nextCursor: rows.length > query.limit ? (page.at(-1)?.id ?? null) : null,
    }
  }

  /** ADM-10: satu panggilan memutuskan laporan, menjalankan aksi pada target, dan menulis audit dalam satu transaksi. */
  async decide(adminId: string, id: string, dto: DecideReportDto, ip?: string) {
    if (dto.status === 'DISMISSED' && dto.action) {
      throw new AppException(
        422,
        'VALIDATION_FAILED',
        'A dismissed report must not include an action',
      )
    }
    const note = dto.note?.trim() || undefined
    let suspendedId: string | undefined
    const result = await this.audit.execute(
      {
        adminId,
        action: `REPORT_${dto.status}${dto.action ? `_${dto.action}` : ''}`,
        targetType: 'REPORT',
        targetId: id,
        detail: { ...(dto.action ? { action: dto.action } : {}), ...(note ? { note } : {}) },
        ip,
      },
      async (tx) => {
        const report = await tx.report.findUnique({ where: { id } })
        if (!report) throw new AppException(404, 'NOT_FOUND', 'Report not found')
        if (report.status !== 'PENDING')
          throw new AppException(409, 'ALREADY_HANDLED', 'Report has already been decided')
        if (dto.action)
          suspendedId = await this.apply(tx, report.targetType, report.targetId, dto.action)
        const handledAt = new Date()
        await tx.report.update({
          where: { id },
          data: { status: dto.status, handledBy: adminId, handledAt },
        })
        return {
          id,
          status: dto.status,
          action: dto.action ?? null,
          handledAt: handledAt.toISOString(),
        }
      },
    )
    if (suspendedId) this.realtime.disconnectUser(suspendedId)
    return result
  }

  private async apply(
    tx: Prisma.TransactionClient,
    type: ReportTargetType,
    targetId: string,
    action: AdminReportAction,
  ): Promise<string | undefined> {
    const gone = () => new AppException(404, 'NOT_FOUND', 'Report target not found')
    if (action === AdminReportAction.SUSPEND_USER) {
      const userId =
        type === 'USER'
          ? targetId
          : type === 'POST'
            ? (await tx.post.findUnique({ where: { id: targetId }, select: { authorId: true } }))
                ?.authorId
            : (await tx.comment.findUnique({ where: { id: targetId }, select: { authorId: true } }))
                ?.authorId
      const user = userId
        ? await tx.user.findFirst({ where: { id: userId, deletedAt: null } })
        : null
      if (!user) throw gone()
      if (user.role === Role.ADMIN) {
        throw new AppException(
          422,
          'ADMIN_TARGET_NOT_ALLOWED',
          'An admin cannot be suspended through a report; change the role first',
        )
      }
      await tx.user.update({ where: { id: user.id }, data: { status: UserStatus.SUSPENDED } })
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      return user.id
    }
    if (type === 'USER')
      throw new AppException(
        422,
        'VALIDATION_FAILED',
        'Content actions do not apply to profile reports',
      )
    const data =
      action === AdminReportAction.HIDE_CONTENT ? { hidden: true } : { deletedAt: new Date() }
    const where = { id: targetId, deletedAt: null }
    const updated =
      type === 'POST'
        ? await tx.post.updateMany({ where, data })
        : await tx.comment.updateMany({ where, data })
    if (!updated.count) throw gone()
    return undefined
  }
}
