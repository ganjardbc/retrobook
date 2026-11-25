import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AdminAuditLogsQuery } from './admin-audit-logs.dto'

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAuditLogsQuery) {
    const createdAt: Prisma.DateTimeFilter = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      // `to` berupa tanggal: sertakan seluruh hari itu.
      ...(query.to ? { lt: new Date(new Date(query.to).getTime() + 24 * 60 * 60 * 1000) } : {}),
    }
    const where: Prisma.AuditLogWhereInput = {
      ...(query.adminId ? { adminId: query.adminId } : {}),
      ...(query.action ? { action: { contains: query.action } } : {}),
      ...(query.from || query.to ? { createdAt } : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          detail: true,
          ip: true,
          createdAt: true,
          admin: { select: { id: true, username: true, displayName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ])
    const items = rows.slice(0, query.limit)
    return {
      items,
      total,
      nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    }
  }
}
