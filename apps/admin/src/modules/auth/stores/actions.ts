import { adminSession } from '@/helpers/session'
import {
  adminAuthApi,
  AdminApiError,
  type Admin,
  type AdminSession,
} from '@/modules/auth/services/api'
import { t } from '@retrobook/shared/i18n'

type AuthStoreContext = {
  user: Admin | null
  start: (session: AdminSession) => void
  clear: () => void
}

export const actions = {
  start(this: AuthStoreContext, session: Awaited<ReturnType<typeof adminAuthApi.login>>) {
    if (session.user.role !== 'ADMIN') throw new Error(t('admin.auth.noAccess'))
    adminSession.set(session)
    this.user = session.user
  },
  async init(this: AuthStoreContext) {
    const token = adminSession.refreshToken
    if (!token) return
    try {
      this.start(await adminAuthApi.refresh(token))
    } catch (error) {
      if (error instanceof AdminApiError && error.status < 500) adminSession.clear()
    }
  },
  async login(this: AuthStoreContext, identifier: string, password: string) {
    this.start(await adminAuthApi.login(identifier, password))
  },
  async logout(this: AuthStoreContext) {
    const token = adminSession.refreshToken
    try {
      if (token) await adminAuthApi.logout(token)
    } finally {
      this.clear()
    }
  },
  clear(this: AuthStoreContext) {
    adminSession.clear()
    this.user = null
  },
}
