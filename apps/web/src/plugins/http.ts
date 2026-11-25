import type { ApiError, AuthSession } from '@retrobook/shared'
import { session } from '@/helpers/session'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly messages: string[],
    /** Detik dari header `Retry-After` (429). */
    public readonly retryAfter?: number,
  ) {
    super(messages.join(' '))
  }
}

type Hooks = {
  /** Sesi tidak bisa dipulihkan (refresh gagal) atau akun dibekukan. */
  onSessionLost: (reason: 'expired' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_BANNED') => void
  /** Setelah refresh berhasil. */
  onRefreshed: (user: AuthSession['user']) => void
  /** BR-12: server menolak non-admin karena maintenance mode. */
  onMaintenance: () => void
}
let hooks: Hooks = { onSessionLost: () => {}, onRefreshed: () => {}, onMaintenance: () => {} }
export const setHttpHooks = (h: Partial<Hooks>) => (hooks = { ...hooks, ...h })

async function toError(res: Response): Promise<ApiRequestError> {
  const body = (await res.json().catch(() => null)) as Partial<ApiError> | null
  const msg = body?.message
  return new ApiRequestError(
    res.status,
    body?.code ?? 'ERROR',
    Array.isArray(msg) ? msg : [msg ?? res.statusText],
    Number(res.headers.get('Retry-After')) || undefined,
  )
}

// FormData dikirim apa adanya: browser yang mengisi Content-Type multipart beserta boundary-nya.
const jsonInit = (method: string, body?: unknown, token?: string | null): RequestInit => ({
  method,
  headers: {
    ...(body !== undefined && !(body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
})

let refreshing: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = session.refreshToken
  if (!refreshToken) return false
  const res = await fetch(`${BASE}/auth/refresh`, jsonInit('POST', { refreshToken }))
  // Hanya penolakan eksplisit yang mengakhiri sesi; error jaringan/500 dilempar apa adanya.
  if (res.status === 401 || res.status === 403) return false
  if (!res.ok) throw await toError(res)
  const data = (await res.json()) as AuthSession
  session.set(data)
  hooks.onRefreshed(data.user)
  return true
}

/** Banyak request bersamaan yang kena 401 hanya memicu satu panggilan refresh (AUTH-03). */
export function refreshSession(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

type Options = { method?: string; body?: unknown; auth?: boolean }

export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts

  const send = () =>
    fetch(`${BASE}${path}`, jsonInit(method, body, auth ? session.accessToken : null))

  let res = await send()
  if (res.status === 401 && auth && session.refreshToken) {
    if (await refreshSession()) {
      res = await send()
    } else {
      session.clear()
      hooks.onSessionLost('expired')
      throw await toError(res)
    }
  }

  if (!res.ok) {
    const err = await toError(res)
    if (auth && (err.code === 'ACCOUNT_SUSPENDED' || err.code === 'ACCOUNT_BANNED')) {
      session.clear()
      hooks.onSessionLost(err.code)
    }
    if (err.code === 'MAINTENANCE_MODE') hooks.onMaintenance()
    throw err
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}
