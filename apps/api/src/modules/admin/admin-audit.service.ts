import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

export type AdminAuditEntry = {
  adminId: number
  action: string
  targetType?: string
  targetId?: number
  detail?: Prisma.InputJsonValue
  ip?: string
}

/** Run an admin mutation and its immutable audit entry in one database transaction. */
@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  execute<T>(
    entry: AdminAuditEntry,
    mutation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const result = await mutation(tx)
        await tx.auditLog.create({
          data: {
            adminId: entry.adminId,
            action: entry.action,
            targetType: entry.targetType,
            targetId: entry.targetId,
            detail: entry.detail,
            ip: entry.ip,
          },
        })
        return result
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  }
}
