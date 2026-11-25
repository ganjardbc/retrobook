import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'

export type ActivityItem = {
  type: 'POST' | 'COMMENT' | 'LIKE'
  id: number
  postId: number
  text: string
  createdAt: string
}

/**
 * ACT-01: jejak aktivitas diri sendiri (post, komentar, like), terbaru dulu. Komentar dan like hanya
 * muncul bila post induknya masih boleh dilihat pemiliknya (aturan terpusat di VisibilityService), jadi
 * log tidak membuka konten yang sudah tersembunyi atau milik orang yang memblokirnya.
 */
@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  // shortcut: kursor berupa waktu ISO item terakhir; dua item dengan milidetik sama di batas halaman bisa terlewat.
  async list(userId: number, limit: number, cursor?: string): Promise<{ items: ActivityItem[]; nextCursor: string | null }> {
    const before = cursor ? { lt: new Date(cursor) } : undefined
    const createdAt = before ? { createdAt: before } : {}
    const visiblePost = { post: this.visibility.postWhere(userId) }
    const [posts, comments, likes] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: userId, deletedAt: null, ...createdAt },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: { id: true, content: true, createdAt: true },
      }),
      this.prisma.comment.findMany({
        where: { authorId: userId, deletedAt: null, ...visiblePost, ...createdAt },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: { id: true, postId: true, content: true, createdAt: true },
      }),
      this.prisma.like.findMany({
        where: { userId, postId: { not: null }, ...visiblePost, ...createdAt },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: { id: true, postId: true, createdAt: true, post: { select: { content: true } } },
      }),
    ])
    const all: (ActivityItem & { at: number })[] = [
      ...posts.map((p) => ({ type: 'POST' as const, id: p.id, postId: p.id, text: p.content, createdAt: p.createdAt.toISOString(), at: p.createdAt.getTime() })),
      ...comments.map((c) => ({ type: 'COMMENT' as const, id: c.id, postId: c.postId, text: c.content, createdAt: c.createdAt.toISOString(), at: c.createdAt.getTime() })),
      ...likes.map((l) => ({ type: 'LIKE' as const, id: l.id, postId: l.postId!, text: l.post?.content ?? '', createdAt: l.createdAt.toISOString(), at: l.createdAt.getTime() })),
    ].sort((a, b) => b.at - a.at || b.id - a.id)
    const page = all.slice(0, limit)
    return {
      items: page.map(({ at: _at, ...item }) => item),
      nextCursor: all.length > limit ? page.at(-1)!.createdAt : null,
    }
  }
}
