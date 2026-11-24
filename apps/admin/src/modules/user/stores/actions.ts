import type { AdminUser, UserListFilters } from '@/modules/user/services/types'

type UserStoreContext = {
  users: AdminUser[]
  search: string
  filters: UserListFilters
}

export const actions = {
  setUsers(this: UserStoreContext, users: AdminUser[]) { this.users = users },
  setSearch(this: UserStoreContext, search: string) { this.search = search },
  setFilters(this: UserStoreContext, filters: UserListFilters) { this.filters = filters },
  resetFilters(this: UserStoreContext) { this.search = ''; this.filters = { status: '', role: '' } },
}
