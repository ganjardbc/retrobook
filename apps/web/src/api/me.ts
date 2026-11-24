import type { Profile } from '@retrobook/shared'
import { request } from './http'

export type ProfileInput = {
  displayName?: string
  bio?: string | null
  birthday?: string | null
  hometown?: string | null
  currentCity?: string | null
  workplace?: string | null
  school?: string | null
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
}
