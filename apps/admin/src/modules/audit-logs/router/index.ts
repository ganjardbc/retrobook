import { PREFIX_ROUTE_NAME, PREFIX_ROUTE_PATH, READ } from '@/modules/audit-logs/services/constants'

export default [
  {
    path: PREFIX_ROUTE_PATH,
    name: PREFIX_ROUTE_NAME,
    component: () => import('@/modules/audit-logs/pages/index.vue'),
    meta: { requiresAdmin: true, permission: [READ], title: 'Audit log' },
  },
]
