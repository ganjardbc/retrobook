import type { Paged, PokeItem } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const pokesApi = {
  list: (cursor?: string | null, limit = 10) =>
    request<Paged<PokeItem>>(`/pokes?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  /** Poke atau poke balik (idempoten). */
  poke: (userId: string) =>
    request<{ userId: string; createdAt: string }>('/pokes', { method: 'POST', body: { userId } }),
  /** "Remove": tandai poke dari `userId` sudah dilihat. */
  dismiss: (userId: string) => request<void>(`/pokes/${userId}`, { method: 'DELETE' }),
}
