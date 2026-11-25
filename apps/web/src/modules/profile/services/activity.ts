import { request } from '@/plugins/http'

export type ActivityItem = {
  type: 'POST' | 'COMMENT' | 'LIKE'
  id: number
  postId: number
  text: string
  createdAt: string
}

export const activityApi = {
  list: (cursor?: string | null) =>
    request<{ items: ActivityItem[]; nextCursor: string | null }>(
      `/activity?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    ),
}
