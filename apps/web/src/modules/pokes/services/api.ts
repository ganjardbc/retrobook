import type { Paged, PokeItem } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const pokesApi = {
  list: (cursor?: number | null, limit = 10) =>
    request<Paged<PokeItem>>(`/pokes?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  /** Poke atau poke balik (idempoten). */
  poke: (userId: number) =>
    request<{ userId: number; createdAt: string }>('/pokes', { method: 'POST', body: { userId } }),
  /** "Remove": tandai poke dari `userId` sudah dilihat. */
  dismiss: (userId: number) => request<void>(`/pokes/${userId}`, { method: 'DELETE' }),
}
