import type { Comment, Paged } from '@retrobook/shared'
import { request } from './http'

export const commentsApi = {
  list: (postId: number, cursor?: number | null, limit = 10) =>
    request<Paged<Comment>>(
      `/posts/${postId}/comments?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  create: (postId: number, content: string) =>
    request<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: { content } }),
  remove: (commentId: number) => request<void>(`/comments/${commentId}`, { method: 'DELETE' }),
}
