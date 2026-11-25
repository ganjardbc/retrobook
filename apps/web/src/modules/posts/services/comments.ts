import type { Comment, Paged } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const commentsApi = {
  list: (postId: number, cursor?: number | null, limit = 10) =>
    request<Paged<Comment>>(
      `/posts/${postId}/comments?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  create: (postId: number, content: string, imageUrl?: string) =>
    request<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { content, ...(imageUrl ? { imageUrl } : {}) },
    }),
  remove: (commentId: number) => request<void>(`/comments/${commentId}`, { method: 'DELETE' }),
  like: (commentId: number) =>
    request<{ likeCount: number; likedByMe: boolean }>(`/comments/${commentId}/like`, {
      method: 'PUT',
    }),
  unlike: (commentId: number) =>
    request<{ likeCount: number; likedByMe: boolean }>(`/comments/${commentId}/like`, {
      method: 'DELETE',
    }),
}
