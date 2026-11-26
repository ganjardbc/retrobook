import { defineStore } from 'pinia'
import { adminReportsApi } from '@/modules/reports/services/api'
import type { AdminReport, ReportAction, ReportStatus } from '@/modules/reports/services/types'
import { t } from '@retrobook/shared/i18n'

export const useReportsStore = defineStore('admin-reports', {
  state: () => ({
    items: [] as AdminReport[],
    total: 0,
    status: 'PENDING' as ReportStatus | '',
    nextCursor: null as string | null,
    selectedId: null as string | null,
    loading: false,
    error: '',
  }),
  getters: { selected: (s) => s.items.find((r) => r.id === s.selectedId) ?? null },
  actions: {
    async fetch(more = false) {
      this.loading = true
      this.error = ''
      try {
        const page = await adminReportsApi.list(this.status, more ? this.nextCursor : null)
        this.items = more ? [...this.items, ...page.items] : page.items
        this.total = page.total
        this.nextCursor = page.nextCursor
        if (!this.selected) this.selectedId = this.items[0]?.id ?? null
      } catch (error) {
        this.error = error instanceof Error ? error.message : t('admin.reports.loadError')
      } finally {
        this.loading = false
      }
    },
    /** Satu panggilan memutuskan; daftar dimuat ulang dan laporan berikutnya otomatis terpilih. */
    async decide(status: 'REVIEWED' | 'DISMISSED', action?: ReportAction, note?: string) {
      if (!this.selected) return
      await adminReportsApi.decide(this.selected.id, status, action, note)
      this.selectedId = null
      await this.fetch()
    },
  },
})
