import type { FeedSort, Paged, Post, PostFeeling, Privacy, YearInReview } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const postsApi = {
  feed: (cursor?: number | null, limit = 10, sort: FeedSort = 'recent') =>
    request<Paged<Post>>(`/feed?limit=${limit}&sort=${sort}${cursor ? `&cursor=${cursor}` : ''}`),
  create: (input: {
    content: string
    privacy?: Privacy
    imageUrl?: string | null
    feeling?: PostFeeling | null
    /** Post grup (GRP-01): hanya anggota; tanpa tag. */
    groupId?: number
    /** WAL-01: tulis di dinding teman. */
    wallOwnerUsername?: string
    /** WAL-02: id teman yang di-tag. */
    taggedUserIds?: number[]
  }) => request<Post>('/posts', { method: 'POST', body: input }),
  update: (
    id: number,
    input: { content: string; privacy: Privacy; feeling?: PostFeeling | null },
  ) => request<Post>(`/posts/${id}`, { method: 'PATCH', body: input }),
  like: (id: number) =>
    request<{ likeCount: number; likedByMe: boolean }>(`/posts/${id}/like`, { method: 'PUT' }),
  unlike: (id: number) =>
    request<{ likeCount: number; likedByMe: boolean }>(`/posts/${id}/like`, { method: 'DELETE' }),
  share: (id: number, input: { content?: string; privacy: Privacy }) =>
    request<Post>(`/posts/${id}/share`, { method: 'POST', body: input }),
  save: (id: number) => request<{ savedByMe: boolean }>(`/posts/${id}/save`, { method: 'PUT' }),
  unsave: (id: number) =>
    request<{ savedByMe: boolean }>(`/posts/${id}/save`, { method: 'DELETE' }),
  saved: (cursor?: number | null, limit = 10) =>
    request<Paged<Post>>(`/saved?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  onThisDay: () => request<Paged<Post>>('/on-this-day').then((r) => ({ ...r, nextCursor: null })),
  yearInReview: (year?: number) =>
    request<YearInReview>(`/year-in-review${year ? `?year=${year}` : ''}`),
  remove: (id: number) => request<void>(`/posts/${id}`, { method: 'DELETE' }),
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string }>('/uploads/post-image', { method: 'POST', body: form })
  },
}
