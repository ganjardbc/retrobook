import { Injectable } from '@nestjs/common'
import { Prisma, ReportTargetType } from '@prisma/client'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { AdminAuditService } from '../admin-audit.service'
import {
  AdminModerationBulkAction,
  AdminModerationFilter,
  type AdminModerationQuery,
} from './admin-moderation.dto'

const notFound = (kind: string) => new AppException(404, 'NOT_FOUND', `${kind} not found`)
const postSelect = {
  id: true,
  content: true,
  imageUrl: true,
  hidden: true,
  flagged: true,
  createdAt: true,
  deletedAt: true,
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  _count: { select: { comments: { where: { deletedAt: null } } } },
} satisfies Prisma.PostSelect
const commentSelect = {
  id: true,
  content: true,
  imageUrl: true,
  hidden: true,
  flagged: true,
  createdAt: true,
  deletedAt: true,
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  post: {
    select: { id: true, content: true, author: { select: { username: true, displayName: true } } },
  },
} satisfies Prisma.CommentSelect

@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  listPosts(query: AdminModerationQuery) {
    return this.list('POST', query)
  }

  listComments(query: AdminModerationQuery) {
    return this.list('COMMENT', query)
  }

  async setPostHidden(adminId: string, id: string, hidden: boolean, ip?: string) {
    return this.setHidden(adminId, 'POST', id, hidden, ip)
  }

  async setCommentHidden(adminId: string, id: string, hidden: boolean, ip?: string) {
    return this.setHidden(adminId, 'COMMENT', id, hidden, ip)
  }

  async deletePost(adminId: string, id: string, ip?: string) {
    return this.deleteOne(adminId, 'POST', id, ip)
  }

  async deleteComment(adminId: string, id: string, ip?: string) {
    return this.deleteOne(adminId, 'COMMENT', id, ip)
  }

  async bulkPosts(
    adminId: string,
    ids: string[],
    action: AdminModerationBulkAction,
    reason?: string,
    ip?: string,
  ) {
    return this.bulk(adminId, 'POST', ids, action, reason, ip)
  }

  async bulkComments(
    adminId: string,
    ids: string[],
    action: AdminModerationBulkAction,
    reason?: string,
    ip?: string,
  ) {
    return this.bulk(adminId, 'COMMENT', ids, action, reason, ip)
  }

  private async list(kind: 'POST' | 'COMMENT', query: AdminModerationQuery) {
    const reportedIds =
      query.filter === AdminModerationFilter.REPORTED
        ? (
            await this.prisma.report.findMany({
              where: {
                targetType: kind === 'POST' ? ReportTargetType.POST : ReportTargetType.COMMENT,
                status: 'PENDING',
              },
              select: { targetId: true },
              distinct: ['targetId'],
            })
          ).map(({ targetId }) => targetId)
        : null
    const createdAt: Prisma.DateTimeFilter = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lt: new Date(new Date(query.to).getTime() + 24 * 60 * 60 * 1000) } : {}),
    }
    const authorSearch = query.q?.trim()
    const base = {
      ...(query.filter === AdminModerationFilter.HIDDEN ? { hidden: true } : {}),
      ...(query.filter === AdminModerationFilter.FLAGGED ? { flagged: true } : {}),
      ...(query.filter === AdminModerationFilter.DELETED
        ? { deletedAt: { not: null } }
        : { deletedAt: null }),
      ...(query.filter === AdminModerationFilter.REPORTED ? { id: { in: reportedIds ?? [] } } : {}),
      ...(query.from || query.to ? { createdAt } : {}),
    }
    const postWhere: Prisma.PostWhereInput = {
      ...base,
      ...(authorSearch
        ? {
            OR: [
              { content: { contains: authorSearch } },
              { author: { username: { contains: authorSearch } } },
              { author: { displayName: { contains: authorSearch } } },
            ],
          }
        : {}),
    }
    const commentWhere: Prisma.CommentWhereInput = {
      ...base,
      ...(authorSearch
        ? {
            OR: [
              { content: { contains: authorSearch } },
              { author: { username: { contains: authorSearch } } },
              { author: { displayName: { contains: authorSearch } } },
            ],
          }
        : {}),
    }
    const pagination = {
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    }
    const rows =
      kind === 'POST'
        ? await this.prisma.post.findMany({ ...pagination, where: postWhere, select: postSelect })
        : await this.prisma.comment.findMany({
            ...pagination,
            where: commentWhere,
            select: commentSelect,
          })
    const items = rows.slice(0, query.limit)
    const targetIds = items.map((item) => item.id)
    const reports = targetIds.length
      ? await this.prisma.report.findMany({
          where: {
            targetType: kind === 'POST' ? ReportTargetType.POST : ReportTargetType.COMMENT,
            targetId: { in: targetIds },
          },
          select: { targetId: true, status: true },
        })
      : []
    const reportCounts = new Map<string, { total: number; pending: number }>()
    for (const report of reports) {
      const count = reportCounts.get(report.targetId) ?? { total: 0, pending: 0 }
      count.total += 1
      if (report.status === 'PENDING') count.pending += 1
      reportCounts.set(report.targetId, count)
    }
    const total =
      kind === 'POST'
        ? await this.prisma.post.count({ where: postWhere })
        : await this.prisma.comment.count({ where: commentWhere })
    return {
      items: items.map((item) => ({
        ...item,
        reports: reportCounts.get(item.id) ?? { total: 0, pending: 0 },
      })),
      total,
      nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    }
  }

  private setHidden(
    adminId: string,
    kind: 'POST' | 'COMMENT',
    id: string,
    hidden: boolean,
    ip?: string,
  ) {
    return this.audit.execute(
      {
        adminId,
        action: `${kind}_MODERATION_${hidden ? 'HIDE' : 'SHOW'}`,
        targetType: kind,
        targetId: id,
        detail: { hidden },
        ip,
      },
      async (tx) => {
        const where = { id, deletedAt: null }
        const updated =
          kind === 'POST'
            ? await tx.post.updateMany({ where, data: { hidden } })
            : await tx.comment.updateMany({ where, data: { hidden } })
        if (!updated.count) throw notFound(kind === 'POST' ? 'Post' : 'Comment')
        return { id, hidden }
      },
    )
  }

  private deleteOne(adminId: string, kind: 'POST' | 'COMMENT', id: string, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: `${kind}_MODERATION_DELETE`,
        targetType: kind,
        targetId: id,
        detail: { method: 'SOFT_DELETE' },
        ip,
      },
      async (tx) => {
        const deletedAt = new Date()
        const where = { id, deletedAt: null }
        const updated =
          kind === 'POST'
            ? await tx.post.updateMany({ where, data: { deletedAt } })
            : await tx.comment.updateMany({ where, data: { deletedAt } })
        if (!updated.count) throw notFound(kind === 'POST' ? 'Post' : 'Comment')
        return { id, deletedAt: deletedAt.toISOString() }
      },
    )
  }

  private bulk(
    adminId: string,
    kind: 'POST' | 'COMMENT',
    ids: string[],
    action: AdminModerationBulkAction,
    reason?: string,
    ip?: string,
  ) {
    return this.audit.execute(
      {
        adminId,
        action: `${kind}_MODERATION_BULK_${action.toUpperCase()}`,
        targetType: kind,
        detail: { ids, ...(reason ? { reason } : {}) },
        ip,
      },
      async (tx) => {
        const where = { id: { in: ids }, deletedAt: null }
        const data =
          action === AdminModerationBulkAction.DELETE
            ? { deletedAt: new Date() }
            : { hidden: action === AdminModerationBulkAction.HIDE }
        const updated =
          kind === 'POST'
            ? await tx.post.updateMany({ where, data })
            : await tx.comment.updateMany({ where, data })
        if (updated.count !== ids.length) throw notFound(kind === 'POST' ? 'Post' : 'Comment')
        return { affected: updated.count, action }
      },
    )
  }
}
