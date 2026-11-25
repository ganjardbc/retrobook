import {
  PREFIX_ROUTE_NAME,
  PREFIX_ROUTE_PATH,
  READ,
} from '@/modules/announcements/services/constants'

export default [
  {
    path: PREFIX_ROUTE_PATH,
    name: PREFIX_ROUTE_NAME,
    component: () => import('@/modules/announcements/pages/index.vue'),
    meta: { requiresAdmin: true, permission: [READ], title: 'Pengumuman' },
  },
]
