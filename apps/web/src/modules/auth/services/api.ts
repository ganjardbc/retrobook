import type { AuthSession } from '@retrobook/shared'
import { request } from '@/plugins/http'

export type RegisterInput = {
  email: string
  username: string
  displayName: string
  password: string
}

export const authApi = {
  register: (input: RegisterInput) =>
    request<AuthSession>('/auth/register', { method: 'POST', body: input, auth: false }),
  login: (identifier: string, password: string) =>
    request<AuthSession>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
      auth: false,
    }),
  logout: (refreshToken: string) =>
    request<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
}
