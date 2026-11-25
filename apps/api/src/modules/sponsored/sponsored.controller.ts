import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('sponsored')
export class SponsoredController {
  constructor(private readonly prisma: PrismaService) {}

  /** SPN-01: satu promosi aktif dan dalam jadwalnya untuk kolom kanan (terbaru dulu), atau null. */
  @Get()
  async current() {
    const now = new Date()
    const item = await this.prisma.sponsored.findFirst({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: { id: 'desc' },
      select: { id: true, title: true, body: true, imageUrl: true, linkUrl: true },
    })
    return { item }
  }
}
