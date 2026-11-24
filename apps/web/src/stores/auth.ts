import type { AuthSession } from '@retrobook/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, type RegisterInput } from '../api/auth'
import { refreshSession, setHttpHooks } from '../api/http'
import { session } from '../api/session'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthSession['user'] | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

  // Refresh otomatis (interceptor) ikut memperbarui user.
  setHttpHooks({ onRefreshed: (u) => (user.value = u) })

  function start(s: AuthSession) {
    session.set(s)
    user.value = s.user
  }

  /** Dipanggil sekali sebelum app dipasang: pulihkan sesi dari refresh token yang tersimpan. */
  async function init() {
    if (!session.refreshToken) return
    try {
      if (!(await refreshSession())) session.clear()
    } catch {
      /* server tidak terjangkau: biarkan sebagai tamu, token tetap tersimpan untuk dicoba lagi */
    }
  }

  async function login(identifier: string, password: string) {
    start(await authApi.login(identifier, password))
  }

  async function register(input: RegisterInput) {
    start(await authApi.register(input))
  }

  async function logout() {
    const token = session.refreshToken
    try {
      if (token) await authApi.logout(token)
    } finally {
      clear()
    }
  }

  /** Menyelaraskan sesi dengan perubahan profil (nama, foto) tanpa login ulang. */
  function patchUser(patch: Partial<NonNullable<typeof user.value>>) {
    if (user.value) user.value = { ...user.value, ...patch }
  }

  function clear() {
    session.clear()
    user.value = null
  }

  return { user, isLoggedIn, init, login, register, logout, patchUser, clear }
})
