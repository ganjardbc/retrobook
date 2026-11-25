import { Injectable } from '@nestjs/common'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { NotificationsService } from '../../notifications/notifications.service'
import { AdminAuditService } from '../admin-audit.service'
import type { CreateAnnouncementDto, UpdateAnnouncementDto } from './admin-announcements.dto'
import { NEWEST_FIRST } from '../../../common/keyset'

const select = { id: true, title: true, body: true, active: true, createdAt: true } as const
const notFound = () => new AppException(404, 'NOT_FOUND', 'Pengumuman tidak ditemukan')

@Injectable()
export class AdminAnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list() {
    return { items: await this.prisma.announcement.findMany({ orderBy: NEWEST_FIRST, select }) }
  }

  /** ADM-13: pengumuman, notifikasi ANNOUNCEMENT ke semua user aktif, dan audit dalam satu transaksi; push realtime setelah commit. */
  async create(adminId: string, dto: CreateAnnouncementDto, ip?: string) {
    const created = await this.audit.execute(
      {
        adminId,
        action: 'ANNOUNCEMENT_CREATE',
        targetType: 'ANNOUNCEMENT',
        detail: { title: dto.title },
        ip,
      },
      async (tx) => {
        const row = await tx.announcement.create({ data: { ...dto, createdBy: adminId }, select })
        const users = await tx.user.findMany({
          where: { status: 'ACTIVE', deletedAt: null, isBot: false },
          select: { id: true },
        })
        await tx.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            type: 'ANNOUNCEMENT' as const,
            announcementId: row.id,
          })),
        })
        return { ...row, notified: users.length }
      },
    )
    void this.notifications.pushAnnouncement(created.id)
    return created
  }

  update(adminId: string, id: string, dto: UpdateAnnouncementDto, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: 'ANNOUNCEMENT_UPDATE',
        targetType: 'ANNOUNCEMENT',
        targetId: id,
        detail: { ...dto },
        ip,
      },
      async (tx) => {
        const updated = await tx.announcement.updateMany({ where: { id }, data: dto })
        if (!updated.count) throw notFound()
        return tx.announcement.findUniqueOrThrow({ where: { id }, select })
      },
    )
  }

  remove(adminId: string, id: string, ip?: string) {
    return this.audit.execute(
      { adminId, action: 'ANNOUNCEMENT_DELETE', targetType: 'ANNOUNCEMENT', targetId: id, ip },
      async (tx) => {
        await tx.notification.deleteMany({ where: { announcementId: id } })
        const deleted = await tx.announcement.deleteMany({ where: { id } })
        if (!deleted.count) throw notFound()
        return { id }
      },
    )
  }
}
