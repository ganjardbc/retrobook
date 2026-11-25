import { adminHttp } from '@/plugins/admin-http'

export type BlockedWord = { id: number; word: string; createdAt: string }
export const adminBlockedWordsApi = {
  list: () => adminHttp.get<{ items: BlockedWord[] }>('/admin/blocked-words'),
  add: (word: string) =>
    adminHttp.post<BlockedWord & { flaggedPosts: number; flaggedComments: number }>(
      '/admin/blocked-words',
      { word },
    ),
  remove: (id: number) => adminHttp.delete<{ id: number }>(`/admin/blocked-words/${id}`),
}
