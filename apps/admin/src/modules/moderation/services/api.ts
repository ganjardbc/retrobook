import { adminHttp } from '@/plugins/admin-http'
import type { ModerationAction, ModerationPage, ModerationQuery, ModerationResource } from './types'

function path(resource: ModerationResource) {
  return `/admin/${resource}`
}
export const adminModerationApi = {
  list: (query: ModerationQuery) => {
    const params = new URLSearchParams({ limit: '20' })
    if (query.filter) params.set('filter', query.filter)
    if (query.q.trim()) params.set('q', query.q.trim())
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)
    if (query.cursor) params.set('cursor', String(query.cursor))
    return adminHttp.get<ModerationPage>(`${path(query.resource)}?${params}`)
  },
  setHidden: (resource: ModerationResource, id: number, hidden: boolean) =>
    adminHttp.patch<{ id: number; hidden: boolean }>(`${path(resource)}/${id}`, { hidden }),
  remove: (resource: ModerationResource, id: number) =>
    adminHttp.delete<{ id: number; deletedAt: string }>(`${path(resource)}/${id}`),
  bulk: (resource: ModerationResource, ids: number[], action: ModerationAction, reason?: string) =>
    adminHttp.post<{ affected: number; action: ModerationAction }>(`${path(resource)}/bulk`, {
      ids,
      action,
      reason,
    }),
}
