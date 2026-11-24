import type { AdminUser, AdminUserDetail, UserListFilters } from '@/modules/user/services/types'

export const state = () => ({
  users: [] as AdminUser[],
  currentUser: null as AdminUserDetail | null,
  search: '',
  filters: { status: '', role: '' } as UserListFilters,
  loading: false,
  detailLoading: false,
  error: '',
  detailError: '',
  total: 0,
  limit: 20,
  cursorStack: [null] as (number | null)[],
  pageIndex: 0,
  nextCursor: null as number | null,
  fetchVersion: 0,
})
