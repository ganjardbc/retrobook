import { Injectable } from '@nestjs/common'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { AdminAuditService } from '../admin-audit.service'
import type { CreateSponsoredDto, UpdateSponsoredDto } from './admin-sponsored.dto'
import { NEWEST_FIRST } from '../../../common/keyset'

const select = {
  id: true,
  title: true,
  body: true,
  imageUrl: true,
  linkUrl: true,
  active: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
} as const
const notFound = () => new AppException(404, 'NOT_FOUND', 'Promo not found')
const toDate = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null ? null : new Date(v)

@Injectable()
export class AdminSponsoredService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list() {
    return { items: await this.prisma.sponsored.findMany({ orderBy: NEWEST_FIRST, select }) }
  }

  create(adminId: string, dto: CreateSponsoredDto, ip?: string) {
    this.assertWindow(toDate(dto.startsAt) ?? null, toDate(dto.endsAt) ?? null)
    return this.audit.execute(
      {
        adminId,
        action: 'SPONSORED_CREATE',
        targetType: 'SPONSORED',
        detail: { title: dto.title },
        ip,
      },
      (tx) =>
        tx.sponsored.create({
          data: {
            title: dto.title,
            body: dto.body,
            linkUrl: dto.linkUrl,
            imageUrl: dto.imageUrl ?? null,
            active: dto.active ?? true,
            startsAt: toDate(dto.startsAt) ?? null,
            endsAt: toDate(dto.endsAt) ?? null,
            createdBy: adminId,
          },
          select,
        }),
    )
  }

  update(adminId: string, id: string, dto: UpdateSponsoredDto, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: 'SPONSORED_UPDATE',
        targetType: 'SPONSORED',
        targetId: id,
        detail: { ...dto },
        ip,
      },
      async (tx) => {
        const current = await tx.sponsored.findUnique({ where: { id }, select })
        if (!current) throw notFound()
        const startsAt =
          toDate(dto.startsAt) === undefined ? current.startsAt : toDate(dto.startsAt)!
        const endsAt = toDate(dto.endsAt) === undefined ? current.endsAt : toDate(dto.endsAt)!
        this.assertWindow(startsAt, endsAt)
        return tx.sponsored.update({
          where: { id },
          data: {
            title: dto.title,
            body: dto.body,
            linkUrl: dto.linkUrl,
            imageUrl: dto.imageUrl,
            active: dto.active,
            startsAt: toDate(dto.startsAt),
            endsAt: toDate(dto.endsAt),
          },
          select,
        })
      },
    )
  }

  remove(adminId: string, id: string, ip?: string) {
    return this.audit.execute(
      { adminId, action: 'SPONSORED_DELETE', targetType: 'SPONSORED', targetId: id, ip },
      async (tx) => {
        const deleted = await tx.sponsored.deleteMany({ where: { id } })
        if (!deleted.count) throw notFound()
        return { id }
      },
    )
  }

  private assertWindow(startsAt: Date | null, endsAt: Date | null) {
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new AppException(400, 'VALIDATION_FAILED', 'End time must be after start time')
    }
  }
}
