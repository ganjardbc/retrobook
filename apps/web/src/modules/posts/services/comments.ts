import type { Comment, Paged } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const commentsApi = {
  list: (postId: string, cursor?: string | null, limit = 10) =>
    request<Paged<Comment>>(
      `/posts/${postId}/comments?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  create: (postId: string, content: string, imageUrl?: string) =>
    request<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { content, ...(imageUrl ? { imageUrl } : {}) },
    }),
  remove: (commentId: string) => request<void>(`/comments/${commentId}`, { method: 'DELETE' }),
  like: (commentId: string) =>
    request<{ likeCount: number; likedByMe: boolean }>(`/comments/${commentId}/like`, {
      method: 'PUT',
    }),
  unlike: (commentId: string) =>
    request<{ likeCount: number; likedByMe: boolean }>(`/comments/${commentId}/like`, {
      method: 'DELETE',
    }),
}
