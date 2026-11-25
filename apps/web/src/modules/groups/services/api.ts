import type { GroupPrivacy, GroupSummary, Paged, Post } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const groupsApi = {
  list: () => request<{ items: GroupSummary[]; suggested: GroupSummary[] }>('/groups'),
  get: (id: number) => request<GroupSummary>(`/groups/${id}`),
  create: (input: { name: string; description: string; privacy: GroupPrivacy }) =>
    request<GroupSummary>('/groups', { method: 'POST', body: input }),
  join: (id: number) => request<GroupSummary>(`/groups/${id}/join`, { method: 'POST' }),
  leave: (id: number) => request<{ left: boolean }>(`/groups/${id}/leave`, { method: 'POST' }),
  posts: (id: number, cursor?: number | null, limit = 10) =>
    request<Paged<Post>>(`/groups/${id}/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  createPost: (id: number, content: string) =>
    request<Post>(`/groups/${id}/posts`, { method: 'POST', body: { content } }),
}
