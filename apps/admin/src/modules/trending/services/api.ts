import { adminHttp } from '@/plugins/admin-http'

export type AdminHashtag = { id: string; tag: string; hidden: boolean; uses: number }
export const adminTrendingApi = {
  list: (q: string, cursor?: string | null) => {
    const params = new URLSearchParams({ limit: '30' })
    if (q.trim()) params.set('q', q.trim())
    if (cursor) params.set('cursor', String(cursor))
    return adminHttp.get<{ items: AdminHashtag[]; nextCursor: string | null }>(
      `/admin/hashtags?${params}`,
    )
  },
  setHidden: (id: string, hidden: boolean) =>
    adminHttp.patch<{ id: string; hidden: boolean }>(`/admin/hashtags/${id}`, { hidden }),
}
