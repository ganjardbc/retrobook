import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

/** BR-08: kata terlarang tidak memblokir; penulisan konten hanya ditandai `flagged` untuk antrean moderasi. */
@Injectable()
export class BlockedWordsService {
  constructor(private readonly prisma: PrismaService) {}

  // shortcut: baca tabel di setiap tulis (kecil, tanpa cache); tambah cache bila daftar tumbuh besar.
  async matches(text: string): Promise<boolean> {
    if (!text.trim()) return false
    const lower = text.toLowerCase()
    const words = await this.prisma.blockedWord.findMany({ select: { word: true } })
    return words.some(({ word }) => lower.includes(word))
  }
}
