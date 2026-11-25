import { adminHttp } from '@/plugins/admin-http'

export type AdminHashtag = { id: number; tag: string; hidden: boolean; uses: number }
export const adminTrendingApi = {
  list: (q: string, cursor?: number | null) => {
    const params = new URLSearchParams({ limit: '30' })
    if (q.trim()) params.set('q', q.trim())
    if (cursor) params.set('cursor', String(cursor))
    return adminHttp.get<{ items: AdminHashtag[]; nextCursor: number | null }>(`/admin/hashtags?${params}`)
  },
  setHidden: (id: number, hidden: boolean) => adminHttp.patch<{ id: number; hidden: boolean }>(`/admin/hashtags/${id}`, { hidden }),
}
