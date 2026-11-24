import type { Paged, Post, Privacy } from '@retrobook/shared'
import { request } from './http'

export const postsApi = {
  feed: (cursor?: number | null, limit = 10) =>
    request<Paged<Post>>(`/feed?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  create: (input: { content: string; privacy: Privacy; imageUrl?: string | null }) =>
    request<Post>('/posts', { method: 'POST', body: input }),
  remove: (id: number) => request<void>(`/posts/${id}`, { method: 'DELETE' }),
  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string }>('/uploads/post-image', { method: 'POST', body: form })
  },
}
