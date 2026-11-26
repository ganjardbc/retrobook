import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { GroupSummary } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { PostsService } from '../posts/posts.service'
import { VisibilityService } from '../visibility/visibility.service'
import { UploadsService } from '../uploads/uploads.service'
import type { CreateGroupDto, UpdateGroupDto } from './dto/group.dto'

const groupInclude = (userId: string) =>
  ({
    _count: { select: { members: true } },
    members: { where: { userId }, select: { userId: true, role: true } },
  }) satisfies Prisma.GroupInclude

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
    private readonly visibility: VisibilityService,
    private readonly uploads: UploadsService,
  ) {}

  async list(userId: string): Promise<{ items: GroupSummary[]; suggested: GroupSummary[] }> {
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

  async create(userId: string, dto: CreateGroupDto): Promise<GroupSummary> {
    const name = dto.name.trim()
    if (!name) throw new AppException(400, 'VALIDATION_FAILED', 'Group name is required')
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

  async get(userId: string, groupId: string): Promise<GroupSummary> {
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

  /** Edit nama, deskripsi, privasi: hanya admin grup. Bukan admin: 404 seperti non-anggota. */
  async update(userId: string, groupId: string, dto: UpdateGroupDto): Promise<GroupSummary> {
    await this.assertAdmin(userId, groupId)
    const name = dto.name?.trim()
    if (dto.name !== undefined && !name)
      throw new AppException(400, 'VALIDATION_FAILED', 'Group name is required')
    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name ? { name } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.privacy ? { privacy: dto.privacy } : {}),
      },
    })
    return this.get(userId, groupId)
  }

  async setPhoto(
    userId: string,
    groupId: string,
    file: { buffer: Buffer } | undefined,
  ): Promise<GroupSummary> {
    await this.assertAdmin(userId, groupId)
    const avatarUrl = await this.uploads.saveImage(file)
    await this.prisma.group.update({ where: { id: groupId }, data: { avatarUrl } })
    return this.get(userId, groupId)
  }

  async join(userId: string, groupId: string) {
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

  async leave(userId: string, groupId: string) {
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
          'The last admin cannot leave while other members remain',
        )
    }
    await this.prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } })
    return { left: true }
  }

  async posts(userId: string, groupId: string, limit: number, cursor?: string) {
    await this.assertMember(userId, groupId)
    return this.postsService.groupTimeline(userId, groupId, limit, cursor)
  }

  async createPost(
    userId: string,
    groupId: string,
    dto: { content: string; imageUrl?: string | null },
  ) {
    await this.assertMember(userId, groupId)
    return this.postsService.create(userId, { ...dto, privacy: 'FRIENDS', groupId })
  }

  private async assertMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupId: true },
    })
    if (!member) throw this.notFound()
  }

  private async assertAdmin(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true },
    })
    if (!member) throw this.notFound()
    if (member.role !== 'ADMIN')
      throw new AppException(403, 'FORBIDDEN', 'Only group admins can edit the group')
  }

  private notFound() {
    return new AppException(404, 'NOT_FOUND', 'Group not found')
  }
}

function toSummary(group: {
  id: string
  name: string
  description: string
  privacy: 'PUBLIC' | 'CLOSED'
  avatarUrl: string | null
  createdBy: string
  createdAt: Date
  _count: { members: number }
  members: { userId: string; role: 'ADMIN' | 'MEMBER' }[]
}): GroupSummary {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    privacy: group.privacy,
    avatarUrl: group.avatarUrl,
    createdBy: group.createdBy,
    createdAt: group.createdAt.toISOString(),
    memberCount: group._count.members,
    isMember: group.members.length > 0,
    isAdmin: group.members[0]?.role === 'ADMIN',
  }
}
