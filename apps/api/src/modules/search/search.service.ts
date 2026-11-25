import { Injectable } from '@nestjs/common'
import type { Paged, UserSummary } from '@retrobook/shared'
import { escapeLike } from '../../common/like'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  /**
   * SRC-01: cari orang berdasarkan nama atau username (mengandung kata kunci). Aturan siapa yang boleh
   * muncul (tidak terhapus, tidak BANNED, tidak ada blokir dua arah) ada di VisibilityService.
   * shortcut: urut abjad nama, belum berdasarkan relevansi (awalan atau teman dulu); naikkan bila perlu.
   */
  async people(
    viewerId: string,
    q: string,
    limit: number,
    cursor?: string,
  ): Promise<Paged<UserSummary>> {
    const like = escapeLike(q)
    const rows = await this.prisma.user.findMany({
      where: {
        AND: [
          this.visibility.userWhere(viewerId),
          { OR: [{ displayName: { contains: like } }, { username: { contains: like } }] },
        ],
      },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true },
    })
    const page = rows.slice(0, limit)
    return {
      items: page,
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    }
  }
}
