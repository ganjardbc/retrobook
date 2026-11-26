import { Injectable } from '@nestjs/common'
import { Prisma, ReportTargetType } from '@prisma/client'
import type { ReportReceipt } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreateReportDto } from './dto/report.dto'

const notFound = () => new AppException(404, 'NOT_FOUND', 'Content not found')

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  /**
   * INT-04: laporkan post, komentar, atau profil. Target hanya sah bila pelapor boleh melihatnya
   * (aturan terpusat di VisibilityService); selain itu 404 yang sama, jadi laporan tidak bisa dipakai
   * untuk menebak keberadaan konten tersembunyi. `target_id` tanpa FK, jadi divalidasi di sini.
   */
  async create(reporterId: string, dto: CreateReportDto): Promise<ReportReceipt> {
    const ownerId = await this.ownerOf(reporterId, dto.targetType, dto.targetId)
    if (ownerId === reporterId) {
      throw new AppException(422, 'SELF_ACTION_NOT_ALLOWED', 'You cannot report yourself')
    }
    try {
      const row = await this.prisma.report.create({
        data: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: dto.reason,
          note: dto.note || null,
        },
      })
      return {
        id: row.id,
        targetType: row.targetType,
        targetId: row.targetId,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
      }
    } catch (e) {
      // Satu laporan per pelapor per target: kendala UNIQUE yang memutuskan (aman dari dua permintaan bersamaan).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppException(409, 'ALREADY_REPORTED', 'You have already reported this')
      }
      throw e
    }
  }

  /** Pemilik target yang terlihat bagi pelapor (penulis post/komentar, atau user itu sendiri); 404 bila tidak. */
  private async ownerOf(viewerId: string, type: ReportTargetType, id: string): Promise<string> {
    if (type === 'POST') {
      const post = await this.prisma.post.findFirst({
        where: { AND: [{ id }, this.visibility.postWhere(viewerId)] },
        select: { authorId: true },
      })
      if (!post) throw notFound()
      return post.authorId
    }
    if (type === 'COMMENT') {
      const comment = await this.prisma.comment.findFirst({
        where: {
          AND: [
            { id },
            this.visibility.commentWhere(viewerId),
            { post: this.visibility.postWhere(viewerId) },
          ],
        },
        select: { authorId: true },
      })
      if (!comment) throw notFound()
      return comment.authorId
    }
    const user = await this.prisma.user.findFirst({
      where: { id, ...this.visibility.userWhere(viewerId) },
      select: { id: true },
    })
    if (!user) throw notFound()
    return user.id
  }
}
