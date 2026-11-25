import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { GroupSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { PostsService } from '../posts/posts.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreateGroupDto } from './dto/group.dto'

const groupInclude = (userId: number) =>
  ({
    _count: { select: { members: true } },
    members: { where: { userId }, select: { userId: true } },
  }) satisfies Prisma.GroupInclude

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
    private readonly visibility: VisibilityService,
  ) {}

  async list(userId: number): Promise<{ items: GroupSummary[]; suggested: GroupSummary[] }> {
    const [joined, suggested] = await Promise.all([
      this.prisma.group.findMany({
        where: { members: { some: { userId } } },
        orderBy: { createdAt: 'desc' },
        include: groupInclude(userId),
      }),
      this.prisma.group.findMany({
        where: {
          privacy: 'PUBLIC',
          members: { none: { userId } },
          // BR-11: kreator yang berpasangan blokir dengan pemirsa tidak ditemukan.
          creator: { AND: [this.visibility.userWhere(userId), { status: 'ACTIVE' }] },
        },
        orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
        take: 12,
        include: groupInclude(userId),
      }),
    ])
    return { items: joined.map(toSummary), suggested: suggested.map(toSummary) }
  }

  async create(userId: number, dto: CreateGroupDto): Promise<GroupSummary> {
    const name = dto.name.trim()
    if (!name) throw new AppException(400, 'VALIDATION_FAILED', 'Nama grup wajib diisi')
    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name,
          description: dto.description?.trim() ?? '',
          privacy: dto.privacy ?? 'PUBLIC',
          createdBy: userId,
        },
      })
      await tx.groupMember.create({ data: { groupId: created.id, userId, role: 'ADMIN' } })
      return tx.group.findUniqueOrThrow({
        where: { id: created.id },
        include: groupInclude(userId),
      })
    })
    return toSummary(group)
  }

  async get(userId: number, groupId: number): Promise<GroupSummary> {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        // Anggota tetap bisa membuka grupnya; non-anggota hanya melihat grup publik dari kreator yang tidak terblokir.
        OR: [
          { privacy: 'PUBLIC', creator: this.visibility.userWhere(userId) },
          {
            members: { some: { userId } },
            creator: { deletedAt: null, status: { not: 'BANNED' } },
          },
        ],
      },
      include: groupInclude(userId),
    })
    if (!group) throw this.notFound()
    return toSummary(group)
  }

  async join(userId: number, groupId: number) {
    // Grup CLOSED tidak bisa dimasuki sendiri; 404 sama seperti non-anggota (tidak membocorkan keberadaan).
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        privacy: 'PUBLIC',
        creator: this.visibility.userWhere(userId),
      },
    })
    if (!group) throw this.notFound()
    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    })
    return this.get(userId, groupId)
  }

  async leave(userId: number, groupId: number) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
    if (!member) throw this.notFound()
    if (member.role === 'ADMIN') {
      const others = await this.prisma.groupMember.findMany({
        where: { groupId, userId: { not: userId } },
        select: { role: true },
      })
      if (others.length > 0 && !others.some((m) => m.role === 'ADMIN'))
        throw new AppException(
          409,
          'CONFLICT',
          'Admin terakhir tidak bisa keluar selama masih ada anggota lain',
        )
    }
    await this.prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } })
    return { left: true }
  }

  async posts(userId: number, groupId: number, limit: number, cursor?: number) {
    await this.assertMember(userId, groupId)
    return this.postsService.groupTimeline(userId, groupId, limit, cursor)
  }

  async createPost(
    userId: number,
    groupId: number,
    dto: { content: string; imageUrl?: string | null },
  ) {
    await this.assertMember(userId, groupId)
    return this.postsService.create(userId, { ...dto, privacy: 'FRIENDS', groupId })
  }

  private async assertMember(userId: number, groupId: number) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupId: true },
    })
    if (!member) throw this.notFound()
  }

  private notFound() {
    return new AppException(404, 'NOT_FOUND', 'Grup tidak ditemukan')
  }
}

function toSummary(group: {
  id: number
  name: string
  description: string
  privacy: 'PUBLIC' | 'CLOSED'
  createdBy: number
  createdAt: Date
  _count: { members: number }
  members: { userId: number }[]
}): GroupSummary {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    privacy: group.privacy,
    createdBy: group.createdBy,
    createdAt: group.createdAt.toISOString(),
    memberCount: group._count.members,
    isMember: group.members.length > 0,
  }
}
