import { Injectable } from '@nestjs/common'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreateLifeEventDto } from './dto/life-event.dto'

@Injectable()
export class LifeEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  listMine(userId: string) {
    return this.prisma.lifeEvent.findMany({
      where: { userId },
      orderBy: [{ happenedOn: 'desc' }, { id: 'desc' }],
    })
  }

  async listProfile(viewerId: string, username: string) {
    const owner = await this.prisma.user.findFirst({
      where: { username, ...this.visibility.userWhere(viewerId) },
      select: { id: true },
    })
    if (!owner) throw this.notFound()
    const self = owner.id === viewerId
    const friend = await this.prisma.user.findFirst({
      where: { id: owner.id, ...this.visibility.friendOf(viewerId) },
      select: { id: true },
    })
    return this.prisma.lifeEvent.findMany({
      where: {
        userId: owner.id,
        ...(self
          ? {}
          : { OR: [{ privacy: 'PUBLIC' }, ...(friend ? [{ privacy: 'FRIENDS' as const }] : [])] }),
      },
      orderBy: [{ happenedOn: 'desc' }, { id: 'desc' }],
    })
  }

  async create(userId: string, dto: CreateLifeEventDto) {
    const title = dto.title.trim()
    const date = new Date(`${dto.happenedOn}T00:00:00.000Z`)
    if (
      !title ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dto.happenedOn ||
      date.getTime() > Date.now()
    ) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Invalid Life Event data')
    }
    return this.prisma.lifeEvent.create({
      data: { userId, kind: dto.kind, title, happenedOn: date, privacy: dto.privacy ?? 'FRIENDS' },
    })
  }

  async remove(userId: string, id: string) {
    const event = await this.prisma.lifeEvent.findFirst({
      where: { id, userId },
      select: { id: true },
    })
    if (!event) throw this.notFound()
    await this.prisma.lifeEvent.delete({ where: { id } })
  }

  private notFound() {
    return new AppException(404, 'NOT_FOUND', 'Life Event not found')
  }
}
