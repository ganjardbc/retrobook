import type { GroupPrivacy, GroupSummary, Paged, Post } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const groupsApi = {
  list: () => request<{ items: GroupSummary[]; suggested: GroupSummary[] }>('/groups'),
  get: (id: number) => request<GroupSummary>(`/groups/${id}`),
  create: (input: { name: string; description: string; privacy: GroupPrivacy }) =>
    request<GroupSummary>('/groups', { method: 'POST', body: input }),
  update: (id: number, input: { name: string; description: string; privacy: GroupPrivacy }) =>
    request<GroupSummary>(`/groups/${id}`, { method: 'PATCH', body: input }),
  uploadPhoto: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<GroupSummary>(`/groups/${id}/photo`, { method: 'POST', body: form })
  },
  join: (id: number) => request<GroupSummary>(`/groups/${id}/join`, { method: 'POST' }),
  leave: (id: number) => request<{ left: boolean }>(`/groups/${id}/leave`, { method: 'POST' }),
  posts: (id: number, cursor?: number | null, limit = 10) =>
    request<Paged<Post>>(`/groups/${id}/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  createPost: (id: number, content: string) =>
    request<Post>(`/groups/${id}/posts`, { method: 'POST', body: { content } }),
}
