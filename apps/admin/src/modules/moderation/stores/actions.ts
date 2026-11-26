import { adminModerationApi } from '@/modules/moderation/services/api'
import type {
  ModerationAction,
  ModerationFilter,
  ModerationResource,
} from '@/modules/moderation/services/types'
import { t } from '@retrobook/shared/i18n'

type StoreContext = {
  resource: ModerationResource
  items: import('@/modules/moderation/services/types').ModerationItem[]
  filter: ModerationFilter
  q: string
  from: string
  to: string
  total: number
  limit: number
  cursorStack: (string | null)[]
  pageIndex: number
  nextCursor: string | null
  loading: boolean
  error: string
  fetchVersion: number
  fetch: () => Promise<void>
  resetPagination: () => void
}

export const actions = {
  async fetch(this: StoreContext) {
    const version = ++this.fetchVersion
    this.loading = true
    this.error = ''
    try {
      const page = await adminModerationApi.list({
        resource: this.resource,
        filter: this.filter,
        q: this.q,
        from: this.from,
        to: this.to,
        cursor: this.cursorStack[this.pageIndex] ?? null,
      })
      if (version !== this.fetchVersion) return
      this.items = page.items
      this.total = page.total
      this.nextCursor = page.nextCursor
    } catch (error) {
      if (version === this.fetchVersion)
        this.error = error instanceof Error ? error.message : t('admin.moderation.error.load')
    } finally {
      if (version === this.fetchVersion) this.loading = false
    }
  },
  resetPagination(this: StoreContext) {
    this.cursorStack = [null]
    this.pageIndex = 0
    this.nextCursor = null
  },
  async nextPage(this: StoreContext) {
    if (this.nextCursor === null || this.loading) return
    this.cursorStack = [...this.cursorStack.slice(0, this.pageIndex + 1), this.nextCursor]
    this.pageIndex += 1
    await this.fetch()
  },
  async previousPage(this: StoreContext) {
    if (this.pageIndex && !this.loading) {
      this.pageIndex -= 1
      await this.fetch()
    }
  },
  async setHidden(this: StoreContext, id: string, hidden: boolean) {
    await adminModerationApi.setHidden(this.resource, id, hidden)
    await this.fetch()
  },
  async remove(this: StoreContext, id: string) {
    await adminModerationApi.remove(this.resource, id)
    await this.fetch()
  },
  async bulk(this: StoreContext, ids: string[], action: ModerationAction, reason?: string) {
    await adminModerationApi.bulk(this.resource, ids, action, reason)
    await this.fetch()
  },
}
