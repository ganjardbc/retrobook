import { PREFIX_ROUTE_NAME, PREFIX_ROUTE_PATH } from '@/modules/dashboard/services/constants'
import { READ } from '@/modules/dashboard/services/rbac'

export default [
  {
    path: PREFIX_ROUTE_PATH,
    name: PREFIX_ROUTE_NAME,
    component: () => import('@/modules/dashboard/pages/index.vue'),
    meta: { requiresAdmin: true, permission: [READ], title: 'Ringkasan' },
  },
]
