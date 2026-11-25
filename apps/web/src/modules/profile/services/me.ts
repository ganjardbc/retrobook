import type { Profile } from '@retrobook/shared'
import { request } from '@/plugins/http'

export type ProfileInput = {
  displayName?: string
  bio?: string | null
  birthday?: string | null
  hometown?: string | null
  currentCity?: string | null
  workplace?: string | null
  school?: string | null
}

export type PrivacySettings = {
  profileInfoPrivacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME'
  friendsPrivacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME'
  defaultPostPrivacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME'
}

const photo = (kind: 'avatar' | 'cover', file: File) => {
  const form = new FormData()
  form.append('file', file)
  return request<Profile>(`/me/${kind}`, { method: 'POST', body: form })
}

export const meApi = {
  update: (input: ProfileInput) => request<Profile>('/me', { method: 'PATCH', body: input }),
  uploadAvatar: (file: File) => photo('avatar', file),
  uploadCover: (file: File) => photo('cover', file),
  privacy: () => request<PrivacySettings>('/me/privacy'),
  updatePrivacy: (input: PrivacySettings) =>
    request<PrivacySettings>('/me/privacy', { method: 'PATCH', body: input }),
  deleteAccount: (password: string) =>
    request<void>('/me', { method: 'DELETE', body: { password } }),
}
