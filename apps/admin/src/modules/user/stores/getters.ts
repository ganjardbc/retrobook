import type { AdminUser } from '@/modules/user/services/types'

export const getters = {
  filteredUsers: (state: {
    users: AdminUser[]
    search: string
    filters: { status: string; role: string }
  }) => {
    const query = state.search.trim().toLowerCase()
    return state.users.filter(
      (user) =>
        (!query ||
          `${user.displayName} ${user.username} ${user.email}`.toLowerCase().includes(query)) &&
        (!state.filters.status || user.status === state.filters.status) &&
        (!state.filters.role || user.role === state.filters.role),
    )
  },
}
