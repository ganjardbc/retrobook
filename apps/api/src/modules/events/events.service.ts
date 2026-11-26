import { Injectable } from '@nestjs/common'
import { RsvpStatus } from '@prisma/client'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreateEventDto } from './dto/event.dto'

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  private include(userId: string) {
    return {
      rsvps: { where: { userId }, select: { status: true } },
      _count: { select: { rsvps: { where: { status: 'GOING' as const } } } },
    }
  }

  private view<
    T extends {
      startsAt: Date
      createdAt: Date
      rsvps: { status: RsvpStatus }[]
      _count: { rsvps: number }
    },
  >(e: T) {
    const { rsvps, _count, ...event } = e
    return {
      ...event,
      startsAt: e.startsAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
      myRsvp: rsvps[0]?.status ?? null,
      rsvpCount: _count.rsvps,
    }
  }

  /** `from` dan `to` (ISO) membatasi rentang; tanpa keduanya, semua event mendatang. */
  async list(userId: string, from?: string, to?: string) {
    const now = new Date()
    const lower = from && new Date(from) > now ? new Date(from) : now
    const events = await this.prisma.event.findMany({
      where: {
        startsAt: { gte: lower, ...(to ? { lte: new Date(to) } : {}) },
        creator: this.visibility.userWhere(userId),
      },
      orderBy: { startsAt: 'asc' },
      take: 100,
      include: this.include(userId),
    })
    return { items: events.map((e) => this.view(e)) }
  }

  async get(userId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, creator: this.visibility.userWhere(userId) },
      include: this.include(userId),
    })
    if (!event) throw new AppException(404, 'NOT_FOUND', 'Event not found')
    return this.view(event)
  }

  async create(userId: string, dto: CreateEventDto) {
    if (!dto.title.trim())
      throw new AppException(400, 'VALIDATION_FAILED', 'Event name is required')
    const startsAt = new Date(dto.startsAt)
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Event time must be in the future')
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

  async rsvp(userId: string, eventId: string, status: RsvpStatus) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        startsAt: { gte: new Date() },
        creator: this.visibility.userWhere(userId),
      },
      select: { id: true },
    })
    if (!event) throw new AppException(404, 'NOT_FOUND', 'Event not found')
    await this.prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status },
      update: { status },
    })
    const count = await this.prisma.eventRsvp.count({ where: { eventId, status: 'GOING' } })
    return { eventId, status, rsvpCount: count }
  }
}
