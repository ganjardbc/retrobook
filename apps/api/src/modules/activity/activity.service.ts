import type { FriendActivity } from '@retrobook/shared'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'
import { cmp } from '../../common/keyset'

/** Jendela "sudah chat" untuk ticker teman (60 menit). */
const RECENT_CHAT_MS = 60 * 60_000

export type ActivityItem = {
  type: 'POST' | 'COMMENT' | 'LIKE'
  id: string
  postId: string
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
  async list(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ items: ActivityItem[]; nextCursor: string | null }> {
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
      ...posts.map((p) => ({
        type: 'POST' as const,
        id: p.id,
        postId: p.id,
        text: p.content,
        createdAt: p.createdAt.toISOString(),
        at: p.createdAt.getTime(),
      })),
      ...comments.map((c) => ({
        type: 'COMMENT' as const,
        id: c.id,
        postId: c.postId,
        text: c.content,
        createdAt: c.createdAt.toISOString(),
        at: c.createdAt.getTime(),
      })),
      ...likes.map((l) => ({
        type: 'LIKE' as const,
        id: l.id,
        postId: l.postId!,
        text: l.post?.content ?? '',
        createdAt: l.createdAt.toISOString(),
        at: l.createdAt.getTime(),
      })),
    ].sort((a, b) => b.at - a.at || cmp(b.id, a.id))
    const page = all.slice(0, limit)
    return {
      items: page.map(({ at: _at, ...item }) => item),
      nextCursor: all.length > limit ? page.at(-1)!.createdAt : null,
    }
  }

  /**
   * Ticker di sidebar chat: aktivitas terbaru teman (post, komentar, like), terbaru dulu. Pelaku harus
   * teman ACCEPTED yang masih terlihat, dan konten (post induk, komentar) harus terlihat bagi pembaca,
   * semua lewat VisibilityService; aktivitas pada post yang tidak boleh dilihat pembaca tidak muncul.
   * Pelaku dipersempit ke teman yang sedang online dan mengirim pesan kepada pembaca dalam 60 menit terakhir.
   */
  async friends(viewerId: string, limit: number): Promise<FriendActivity[]> {
    const v = this.visibility
    const actor = { AND: [v.userWhere(viewerId), v.friendOf(viewerId)] }
    const post = v.postWhere(viewerId)
    const since = new Date(Date.now() - RECENT_CHAT_MS)
    const chatted = await this.prisma.message.findMany({
      where: { receiverId: viewerId, deletedAt: null, createdAt: { gte: since }, sender: actor },
      distinct: ['senderId'],
      select: { senderId: true },
    })
    const ids = chatted.map((m) => m.senderId)
    if (!ids.length) return []
    const user = {
      select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true },
    }
    const parent = {
      select: { id: true, content: true, author: { select: { id: true, displayName: true } } },
    }
    const [posts, comments, likes] = await Promise.all([
      this.prisma.post.findMany({
        where: { AND: [post, { authorId: { in: ids } }] },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, content: true, createdAt: true, author: user },
      }),
      this.prisma.comment.findMany({
        where: { AND: [v.commentWhere(viewerId), { authorId: { in: ids } }, { post }] },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, content: true, createdAt: true, author: user, post: parent },
      }),
      this.prisma.like.findMany({
        where: { AND: [{ postId: { not: null } }, { userId: { in: ids } }, { post }] },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, createdAt: true, user, post: parent },
      }),
    ])
    const cut = (text: string) => text.slice(0, 100)
    return [
      ...posts.map((p) => ({
        type: 'POST' as const,
        id: p.id,
        actor: p.author,
        postId: p.id,
        postAuthor: { id: p.author.id, displayName: p.author.displayName },
        text: cut(p.content),
        createdAt: p.createdAt,
      })),
      ...comments.map((c) => ({
        type: 'COMMENT' as const,
        id: c.id,
        actor: c.author,
        postId: c.post.id,
        postAuthor: c.post.author,
        text: cut(c.content),
        createdAt: c.createdAt,
      })),
      ...likes.map((l) => ({
        type: 'LIKE' as const,
        id: l.id,
        actor: l.user,
        postId: l.post!.id,
        postAuthor: l.post!.author,
        text: cut(l.post!.content),
        createdAt: l.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || cmp(b.id, a.id))
      .slice(0, limit)
      .map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))
  }
}
