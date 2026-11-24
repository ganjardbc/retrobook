import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { session } from '../api/session'
import { useAuthStore } from './auth'

const sessionBody = {
  user: { id: 1, username: 'budi', displayName: 'Budi' },
  accessToken: 'a1',
  refreshToken: 'r1',
}
const res = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

describe('auth store', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  beforeEach(() => {
    localStorage.clear()
    session.clear()
    setActivePinia(createPinia())
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('login menyimpan user dan token', async () => {
    fetchMock.mockResolvedValueOnce(res(200, sessionBody))
    const auth = useAuthStore()
    await auth.login('budi', 'password123')
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.user?.username).toBe('budi')
    expect(session.refreshToken).toBe('r1')
  })

  it('login gagal tidak mengubah state', async () => {
    fetchMock.mockResolvedValueOnce(
      res(401, { statusCode: 401, message: 'x', code: 'INVALID_CREDENTIALS' }),
    )
    const auth = useAuthStore()
    await expect(auth.login('budi', 'salah')).rejects.toThrow()
    expect(auth.isLoggedIn).toBe(false)
  })

  it('logout membersihkan sesi meski server gagal', async () => {
    fetchMock.mockResolvedValueOnce(res(200, sessionBody))
    const auth = useAuthStore()
    await auth.login('budi', 'password123')
    fetchMock.mockRejectedValueOnce(new TypeError('network'))
    await expect(auth.logout()).rejects.toThrow()
    expect(auth.isLoggedIn).toBe(false)
    expect(session.refreshToken).toBeNull()
  })

  it('init memulihkan sesi dari refresh token tersimpan', async () => {
    session.set({ accessToken: 'old', refreshToken: 'r0' })
    fetchMock.mockResolvedValueOnce(res(200, sessionBody))
    const auth = useAuthStore()
    await auth.init()
    expect(session.refreshToken).toBe('r1')
    expect(auth.user?.username).toBe('budi')
  })

  it('init dengan refresh token ditolak membersihkan sesi', async () => {
    session.set({ accessToken: 'old', refreshToken: 'r0' })
    fetchMock.mockResolvedValueOnce(
      res(401, { statusCode: 401, message: 'x', code: 'UNAUTHORIZED' }),
    )
    await useAuthStore().init()
    expect(session.refreshToken).toBeNull()
  })
})
