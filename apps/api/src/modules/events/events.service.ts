import { Injectable } from '@nestjs/common'
import { RsvpStatus } from '@prisma/client'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateEventDto } from './dto/event.dto'

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    const events = await this.prisma.event.findMany({
      where: {
        startsAt: { gte: new Date() },
        creator: { deletedAt: null, status: { not: 'BANNED' } },
      },
      orderBy: { startsAt: 'asc' },
      take: 100,
      include: {
        rsvps: { where: { userId }, select: { status: true } },
        _count: { select: { rsvps: true } },
      },
    })
    return {
      items: events.map(({ rsvps, _count, ...event }) => ({
        ...event,
        startsAt: event.startsAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
        myRsvp: rsvps[0]?.status ?? null,
        rsvpCount: _count.rsvps,
      })),
    }
  }

  async create(userId: number, dto: CreateEventDto) {
    if (!dto.title.trim())
      throw new AppException(400, 'VALIDATION_FAILED', 'Nama event wajib diisi')
    const startsAt = new Date(dto.startsAt)
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Waktu event harus berada di masa depan')
    }
    const row = await this.prisma.event.create({
      data: {
        createdBy: userId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        location: dto.location?.trim() ?? '',
        startsAt,
      },
    })
    return {
      ...row,
      startsAt: row.startsAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      myRsvp: null,
      rsvpCount: 0,
    }
  }

  async rsvp(userId: number, eventId: number, status: RsvpStatus) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, startsAt: { gte: new Date() } },
      select: { id: true },
    })
    if (!event) throw new AppException(404, 'NOT_FOUND', 'Event tidak ditemukan')
    await this.prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status },
      update: { status },
    })
    const count = await this.prisma.eventRsvp.count({ where: { eventId } })
    return { eventId, status, rsvpCount: count }
  }
}
