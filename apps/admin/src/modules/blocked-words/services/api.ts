import { adminHttp } from '@/plugins/admin-http'

export type BlockedWord = { id: string; word: string; createdAt: string }
export const adminBlockedWordsApi = {
  list: () => adminHttp.get<{ items: BlockedWord[] }>('/admin/blocked-words'),
  add: (word: string) =>
    adminHttp.post<BlockedWord & { flaggedPosts: number; flaggedComments: number }>(
      '/admin/blocked-words',
      { word },
    ),
  remove: (id: string) => adminHttp.delete<{ id: string }>(`/admin/blocked-words/${id}`),
}
