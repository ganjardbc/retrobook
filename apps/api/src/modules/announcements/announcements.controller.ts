import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NEWEST_FIRST } from '../../common/keyset'

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly prisma: PrismaService) {}

  /** ADM-13: banner di feed. Hanya yang aktif, terbaru dulu. */
  @Get('active')
  async active() {
    const items = await this.prisma.announcement.findMany({
      where: { active: true },
      orderBy: NEWEST_FIRST,
      take: 5,
      select: { id: true, title: true, body: true, createdAt: true },
    })
    return { items }
  }
}
