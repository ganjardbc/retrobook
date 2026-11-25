import type { Paged, Post, TrendingTag, UserSummary } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const MIN_QUERY = 2

export const searchApi = {
  /** Cari orang (SRC-01). Dropdown memakai 8; halaman hasil 10 per halaman. */
  people: (q: string, cursor?: string | null, limit = 8) =>
    request<Paged<UserSummary>>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  /** SRC-05: cari isi post yang boleh dibaca pembaca. */
  posts: (q: string, cursor?: string | null, limit = 10) =>
    request<Paged<Post>>(
      `/search/posts?q=${encodeURIComponent(q)}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  /** SRC-02: hashtag terbanyak 24 jam terakhir. */
  trending: () => request<{ items: TrendingTag[] }>('/trending'),
  /** POST-10: post publik dengan hashtag ini. */
  hashtagPosts: (tag: string, cursor?: string | null, limit = 10) =>
    request<Paged<Post>>(
      `/hashtags/${encodeURIComponent(tag)}/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
}
