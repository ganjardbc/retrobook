// Access token hanya di memori; refresh token di localStorage supaya sesi bertahan setelah reload.
// Risiko XSS diterima karena app tidak memakai v-html untuk konten pengguna.
const KEY = 'rb.refreshToken'

let accessToken: string | null = null

export const session = {
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
      /* penyimpanan diblokir: sesi hanya hidup selama tab terbuka */
    }
  },
  clear() {
    accessToken = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* abaikan */
    }
  },
}
