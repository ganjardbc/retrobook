import type { Paged, UserSummary } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const blocksApi = {
  block: (userId: number) =>
    request<{ userId: number }>('/blocks', { method: 'POST', body: { userId } }),
  unblock: (userId: number) => request<void>(`/blocks/${userId}`, { method: 'DELETE' }),
  list: () => request<Paged<UserSummary>>('/blocks?limit=50'),
}
