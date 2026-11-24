import { PREFIX_ROUTE_NAME, PREFIX_ROUTE_PATH } from '@/modules/moderation/services/constants'
import { READ } from '@/modules/moderation/services/rbac'

export default [{
  path: PREFIX_ROUTE_PATH,
  name: PREFIX_ROUTE_NAME,
  component: () => import('@/modules/moderation/pages/index.vue'),
  meta: { requiresAdmin: true, permission: [READ], title: 'Moderasi' },
}]
