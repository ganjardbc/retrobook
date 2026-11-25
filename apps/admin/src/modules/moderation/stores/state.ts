import type {
  ModerationFilter,
  ModerationItem,
  ModerationResource,
} from '@/modules/moderation/services/types'

export const state = () => ({
  resource: 'posts' as ModerationResource,
  items: [] as ModerationItem[],
  filter: '' as ModerationFilter,
  q: '',
  from: '',
  to: '',
  total: 0,
  limit: 20,
  cursorStack: [null] as (string | null)[],
  pageIndex: 0,
  nextCursor: null as string | null,
  loading: false,
  error: '',
  fetchVersion: 0,
})
