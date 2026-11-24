import type { FriendsPage, Paged, Post, Profile, ProfilePhoto } from '@retrobook/shared'
import { request } from './http'

export const usersApi = {
  profile: (username: string) => request<Profile>(`/users/${encodeURIComponent(username)}`),
  timeline: (username: string, cursor?: number | null, limit = 10) =>
    request<Paged<Post>>(
      `/users/${encodeURIComponent(username)}/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  friends: (username: string, cursor?: number | null, limit = 10) =>
    request<FriendsPage>(
      `/users/${encodeURIComponent(username)}/friends?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  photos: (username: string, cursor?: number | null, limit = 12) =>
    request<Paged<ProfilePhoto>>(
      `/users/${encodeURIComponent(username)}/photos?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
}
