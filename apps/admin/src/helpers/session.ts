const KEY = 'rb.admin.refreshToken'
let accessToken: string | null = null

export const adminSession = {
  get accessToken() {
    return accessToken
  },
  get refreshToken(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken
    try {
      localStorage.setItem(KEY, tokens.refreshToken)
    } catch {
      /* session stays in memory */
    }
  },
  clear() {
    accessToken = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* storage may be unavailable */
    }
  },
}
