import { adminSession } from '@/helpers/session'
import { adminAuthApi, adminFetch, AdminApiError } from '@/modules/auth/services/api'
import { t } from '@retrobook/shared/i18n'

const BASE = import.meta.env.VITE_API_URL ?? '/api'
type RequestOptions = { method?: string; body?: unknown }

async function send<T>(path: string, options: RequestOptions): Promise<T> {
  const sendRequest = () =>
    adminFetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(adminSession.accessToken
          ? { Authorization: `Bearer ${adminSession.accessToken}` }
          : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    })

  let response = await sendRequest()
  if (response.status === 401 && adminSession.refreshToken) {
    try {
      const refreshed = await adminAuthApi.refresh(adminSession.refreshToken)
      if (refreshed.user.role !== 'ADMIN') throw new AdminApiError(403, t('admin.http.adminOnly'))
      adminSession.set(refreshed)
      response = await sendRequest()
    } catch (error) {
      // status 0 = jaringan/timeout: sesi tetap utuh
      if (error instanceof AdminApiError && (error.status === 0 || error.status >= 500)) throw error
      adminSession.clear()
      window.dispatchEvent(new Event('admin:session-expired'))
      throw error
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.message
    throw new AdminApiError(
      response.status,
      Array.isArray(message) ? message.join(' ') : (message ?? t('admin.http.failed')),
    )
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>)
}

export const adminHttp = {
  get: <T>(path: string) => send<T>(path, {}),
  patch: <T>(path: string, body: unknown) => send<T>(path, { method: 'PATCH', body }),
  post: <T>(path: string, body?: unknown) => send<T>(path, { method: 'POST', body }),
  delete: <T>(path: string) => send<T>(path, { method: 'DELETE' }),
}
