import type { Paged, UserSummary } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const blocksApi = {
  block: (userId: string) =>
    request<{ userId: string }>('/blocks', { method: 'POST', body: { userId } }),
  unblock: (userId: string) => request<void>(`/blocks/${userId}`, { method: 'DELETE' }),
  list: () => request<Paged<UserSummary>>('/blocks?limit=50'),
}
