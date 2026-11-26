import type { AdminUser, UserListFilters } from '@/modules/user/services/types'
import type { AdminUserDetail } from '@/modules/user/services/types'
import { adminUsersApi } from '@/modules/user/services/api'
import { AdminApiError } from '@/modules/auth/services/api'
import { t } from '@retrobook/shared/i18n'

type UserStoreContext = {
  users: AdminUser[]
  currentUser: AdminUserDetail | null
  search: string
  filters: UserListFilters
  loading: boolean
  detailLoading: boolean
  error: string
  detailError: string
  total: number
  limit: number
  cursorStack: (string | null)[]
  pageIndex: number
  nextCursor: string | null
  fetchVersion: number
  fetchUsers: () => Promise<void>
  resetPagination: () => void
}

export const actions = {
  setUsers(this: UserStoreContext, users: AdminUser[]) {
    this.users = users
  },
  setSearch(this: UserStoreContext, search: string) {
    this.search = search
  },
  setFilters(this: UserStoreContext, filters: UserListFilters) {
    this.filters = filters
  },
  async fetchUsers(this: UserStoreContext) {
    const requestVersion = ++this.fetchVersion
    this.loading = true
    this.error = ''
    try {
      const page = await adminUsersApi.list({
        q: this.search.trim(),
        ...this.filters,
        cursor: this.cursorStack[this.pageIndex] ?? null,
        limit: this.limit,
      })
      if (requestVersion !== this.fetchVersion) return
      this.users = page.items
      this.total = page.total
      this.nextCursor = page.nextCursor
    } catch (error) {
      if (requestVersion === this.fetchVersion) {
        this.error = error instanceof AdminApiError ? error.message : t('admin.users.loadError')
      }
    } finally {
      if (requestVersion === this.fetchVersion) this.loading = false
    }
  },
  async fetchDetail(this: UserStoreContext, id: string) {
    this.detailLoading = true
    this.detailError = ''
    this.currentUser = null
    try {
      this.currentUser = await adminUsersApi.detail(id)
    } catch (error) {
      this.detailError =
        error instanceof AdminApiError ? error.message : t('admin.detail.loadError')
    } finally {
      this.detailLoading = false
    }
  },
  resetPagination(this: UserStoreContext) {
    this.cursorStack = [null]
    this.pageIndex = 0
    this.nextCursor = null
  },
  async nextPage(this: UserStoreContext) {
    if (this.nextCursor === null || this.loading) return
    this.cursorStack = [...this.cursorStack.slice(0, this.pageIndex + 1), this.nextCursor]
    this.pageIndex += 1
    await this.fetchUsers()
  },
  async previousPage(this: UserStoreContext) {
    if (this.pageIndex === 0 || this.loading) return
    this.pageIndex -= 1
    await this.fetchUsers()
  },
  resetFilters(this: UserStoreContext) {
    this.search = ''
    this.filters = { status: '', role: '' }
    this.resetPagination()
    void this.fetchUsers()
  },
}
