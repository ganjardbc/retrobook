import type { AdminUser, UserListFilters } from '@/modules/user/services/types'

export const state = () => ({
  users: [] as AdminUser[],
  search: '',
  filters: { status: '', role: '' } as UserListFilters,
  loading: false,
})
