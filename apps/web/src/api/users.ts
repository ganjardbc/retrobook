import type { Paged, Post, Profile } from '@retrobook/shared'
import { request } from './http'

export const usersApi = {
  profile: (username: string) => request<Profile>(`/users/${encodeURIComponent(username)}`),
  timeline: (username: string, cursor?: number | null, limit = 10) =>
    request<Paged<Post>>(
      `/users/${encodeURIComponent(username)}/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
}
