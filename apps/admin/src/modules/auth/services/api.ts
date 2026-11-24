import type { AuthSession } from '@retrobook/shared'

const BASE = import.meta.env.VITE_API_URL ?? '/api'
export type Admin = AuthSession['user']
export type AdminSession = Omit<AuthSession, 'user'> & { user: Admin & { role: 'ADMIN' | 'USER' } }

export class AdminApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

async function send<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.message
    throw new AdminApiError(response.status, Array.isArray(message) ? message.join(' ') : message ?? 'Permintaan gagal.')
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>
}

export const adminAuthApi = {
  login: (identifier: string, password: string) => send<AdminSession>('/admin/auth/login', { identifier, password }),
  refresh: (refreshToken: string) => send<AdminSession>('/admin/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => send<void>('/admin/auth/logout', { refreshToken }),
}
