import { PREFIX_ROUTE_NAME, PREFIX_ROUTE_PATH, READ } from '@/modules/sponsored/services/constants'

export default [
  {
    path: PREFIX_ROUTE_PATH,
    name: PREFIX_ROUTE_NAME,
    component: () => import('@/modules/sponsored/pages/index.vue'),
    meta: { requiresAdmin: true, permission: [READ], title: 'Sponsored' },
  },
]
