import type { DashboardStats } from '@/modules/dashboard/services/types'

export const state = () => ({ stats: null as DashboardStats | null, loading: false, error: '' })
