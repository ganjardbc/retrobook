import { Injectable } from '@nestjs/common'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { AdminAuditService } from '../admin-audit.service'
import type { AdminHashtagsQuery } from './admin-hashtags.dto'

@Injectable()
export class AdminHashtagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  /** ADM-17: daftar hashtag (terbanyak dipakai dulu) beserta status tersembunyi dari trending. */
  async list(query: AdminHashtagsQuery) {
    const where = query.q ? { tag: { contains: query.q } } : {}
    const rows = await this.prisma.hashtag.findMany({
      where,
      orderBy: [{ posts: { _count: 'desc' } }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, tag: true, hidden: true, _count: { select: { posts: true } } },
    })
    const items = rows
      .slice(0, query.limit)
      .map(({ _count, ...h }) => ({ ...h, uses: _count.posts }))
    return { items, nextCursor: rows.length > query.limit ? items.at(-1)!.id : null }
  }

  setHidden(adminId: string, id: string, hidden: boolean, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: `HASHTAG_${hidden ? 'HIDE' : 'SHOW'}`,
        targetType: 'HASHTAG',
        targetId: id,
        ip,
      },
      async (tx) => {
        const updated = await tx.hashtag.updateMany({ where: { id }, data: { hidden } })
        if (!updated.count) throw new AppException(404, 'NOT_FOUND', 'Hashtag not found')
        return { id, hidden }
      },
    )
  }
}
