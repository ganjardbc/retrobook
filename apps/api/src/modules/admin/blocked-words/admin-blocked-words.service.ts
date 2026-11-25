import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AppException } from '../../../common/app-exception'
import { PrismaService } from '../../../prisma/prisma.service'
import { AdminAuditService } from '../admin-audit.service'

@Injectable()
export class AdminBlockedWordsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService) {}

  async list() {
    const items = await this.prisma.blockedWord.findMany({ orderBy: { word: 'asc' }, select: { id: true, word: true, createdAt: true } })
    return { items }
  }

  /** ADM-11: simpan kata (huruf kecil, unik) dan tandai konten lama yang memuatnya, satu transaksi dengan audit. */
  async create(adminId: number, word: string, ip?: string) {
    try {
      return await this.audit.execute({ adminId, action: 'BLOCKED_WORD_ADD', targetType: 'BLOCKED_WORD', detail: { word }, ip }, async (tx) => {
        const row = await tx.blockedWord.create({ data: { word, createdBy: adminId }, select: { id: true, word: true, createdAt: true } })
        const where = { content: { contains: word }, deletedAt: null }
        const [posts, comments] = await Promise.all([
          tx.post.updateMany({ where, data: { flagged: true } }),
          tx.comment.updateMany({ where, data: { flagged: true } }),
        ])
        return { ...row, flaggedPosts: posts.count, flaggedComments: comments.count }
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppException(409, 'CONFLICT', 'Kata sudah ada')
      }
      throw e
    }
  }

  // Tanda `flagged` pada konten lama tidak dicabut: bisa berasal dari kata lain; admin menilainya di antrean moderasi.
  remove(adminId: number, id: number, ip?: string) {
    return this.audit.execute({ adminId, action: 'BLOCKED_WORD_REMOVE', targetType: 'BLOCKED_WORD', targetId: id, ip }, async (tx) => {
      const deleted = await tx.blockedWord.deleteMany({ where: { id } })
      if (!deleted.count) throw new AppException(404, 'NOT_FOUND', 'Kata tidak ditemukan')
      return { id }
    })
  }
}
