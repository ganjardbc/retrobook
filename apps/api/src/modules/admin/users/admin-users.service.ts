import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { Prisma, Role, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { RealtimeGateway } from '../../realtime/realtime.gateway'
import { AdminAuditService } from '../admin-audit.service'
import type {
  AdminUsersQuery,
  UpdateAdminUserRoleDto,
  UpdateAdminUserStatusDto,
} from './admin-users.dto'

const userNotFound = () => new AppException(404, 'NOT_FOUND', 'User not found')
const lastAdmin = () =>
  new AppException(422, 'LAST_ADMIN', 'Cannot delete or deactivate the last admin')

const listSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  role: true,
  status: true,
  isBot: true,
  createdAt: true,
} satisfies Prisma.UserSelect

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(query: AdminUsersQuery) {
    const q = query.q?.trim()
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q } },
              { displayName: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: listSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      this.prisma.user.count({ where }),
    ])
    const items = rows.slice(0, query.limit)
    return {
      items,
      total,
      nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async detail(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...listSelect,
        lastSeenAt: true,
      },
    })
    if (!user) throw userNotFound()
    const [postCount, commentCount, reportCount] = await Promise.all([
      this.prisma.post.count({ where: { authorId: id, deletedAt: null } }),
      this.prisma.comment.count({ where: { authorId: id, deletedAt: null } }),
      this.prisma.report.count({ where: { targetType: 'USER', targetId: id } }),
    ])
    return { ...user, postCount, commentCount, reportCount }
  }

  async updateStatus(adminId: string, id: string, dto: UpdateAdminUserStatusDto, ip?: string) {
    const result = await this.applyStatus(adminId, id, dto, ip)
    if (dto.status !== UserStatus.ACTIVE) this.realtime.disconnectUser(id)
    return result
  }

  private applyStatus(adminId: string, id: string, dto: UpdateAdminUserStatusDto, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: `USER_STATUS_${dto.status}`,
        targetType: 'USER',
        targetId: id,
        detail: { reason: dto.reason },
        ip,
      },
      async (tx) => {
        const current = await tx.user.findFirst({ where: { id, deletedAt: null } })
        if (!current) throw userNotFound()
        if (
          current.role === Role.ADMIN &&
          current.status === UserStatus.ACTIVE &&
          dto.status !== UserStatus.ACTIVE
        ) {
          await this.assertAnotherActiveAdmin(tx, id)
        }
        const updated = await tx.user.update({
          where: { id },
          data: { status: dto.status },
          select: listSelect,
        })
        let revokedSessions = 0
        if (dto.status !== UserStatus.ACTIVE) {
          const revoked = await tx.refreshToken.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          })
          revokedSessions = revoked.count
        }
        return { ...updated, revokedSessions }
      },
    )
  }

  updateRole(adminId: string, id: string, dto: UpdateAdminUserRoleDto, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: `USER_ROLE_${dto.role}`,
        targetType: 'USER',
        targetId: id,
        detail: { role: dto.role },
        ip,
      },
      async (tx) => {
        const current = await tx.user.findFirst({ where: { id, deletedAt: null } })
        if (!current) throw userNotFound()
        if (
          current.role === Role.ADMIN &&
          current.status === UserStatus.ACTIVE &&
          dto.role !== Role.ADMIN
        ) {
          await this.assertAnotherActiveAdmin(tx, id)
        }
        if (current.role !== dto.role) {
          await tx.user.update({ where: { id }, data: { role: dto.role } })
          await tx.refreshToken.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          })
        }
        return tx.user.findUniqueOrThrow({ where: { id }, select: listSelect })
      },
    )
  }

  async resetPassword(adminId: string, id: string, ip?: string) {
    const current = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!current) throw userNotFound()

    const temporaryPassword = randomBytes(18).toString('base64url')
    const passwordHash = await argon2.hash(temporaryPassword)
    const result = await this.audit.execute(
      {
        adminId,
        action: 'USER_PASSWORD_RESET',
        targetType: 'USER',
        targetId: id,
        detail: { method: 'TEMPORARY_PASSWORD', sessionsRevoked: true },
        ip,
      },
      async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id, deletedAt: null },
          data: { passwordHash },
        })
        if (!updated.count) throw userNotFound()
        const revoked = await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        return { revokedSessions: revoked.count }
      },
    )
    return { temporaryPassword, ...result }
  }

  delete(adminId: string, id: string, ip?: string) {
    return this.audit.execute(
      {
        adminId,
        action: 'USER_DELETE',
        targetType: 'USER',
        targetId: id,
        detail: { method: 'SOFT_DELETE' },
        ip,
      },
      async (tx) => {
        const current = await tx.user.findFirst({
          where: { id, deletedAt: null },
          select: { id: true, role: true, status: true },
        })
        if (!current) throw userNotFound()
        if (current.role === Role.ADMIN && current.status === UserStatus.ACTIVE) {
          await this.assertAnotherActiveAdmin(tx, id)
        }
        const deletedAt = new Date()
        await tx.user.update({ where: { id }, data: { deletedAt } })
        const revoked = await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: deletedAt },
        })
        return { id, deletedAt: deletedAt.toISOString(), revokedSessions: revoked.count }
      },
    )
  }

  private async assertAnotherActiveAdmin(tx: Prisma.TransactionClient, excludingId: string) {
    const otherActiveAdmins = await tx.user.count({
      where: {
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        id: { not: excludingId },
      },
    })
    if (otherActiveAdmins < 1) throw lastAdmin()
  }
}
