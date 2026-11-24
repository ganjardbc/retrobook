import type { Paged, UserSummary } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const MIN_QUERY = 2

export const searchApi = {
  /** Cari orang (SRC-01). Dropdown memakai 8; halaman hasil 10 per halaman. */
  people: (q: string, cursor?: number | null, limit = 8) =>
    request<Paged<UserSummary>>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
}
