import { PREFIX_ROUTE_NAME, PREFIX_ROUTE_PATH } from '@/modules/user/services/constants'
import { READ } from '@/modules/user/services/rbac'

export default [
  {
    path: PREFIX_ROUTE_PATH,
    name: PREFIX_ROUTE_NAME,
    component: () => import('@/modules/user/pages/index.vue'),
    meta: { requiresAdmin: true, permission: [READ], title: 'Pengguna' },
  },
  {
    path: `${PREFIX_ROUTE_PATH}/:id`,
    name: `${PREFIX_ROUTE_NAME}-detail`,
    component: () => import('@/modules/user/pages/detail.vue'),
    meta: { requiresAdmin: true, permission: [READ], title: 'Detail Pengguna' },
  },
]
