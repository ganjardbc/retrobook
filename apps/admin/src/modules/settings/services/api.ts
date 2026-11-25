import { adminHttp } from '@/plugins/admin-http'

export type SystemSettings = { maintenanceMode: boolean; registrationOpen: boolean }
export const adminSettingsApi = {
  get: () => adminHttp.get<SystemSettings>('/admin/settings'),
  update: (changes: Partial<SystemSettings>) => adminHttp.patch<SystemSettings>('/admin/settings', changes),
}
