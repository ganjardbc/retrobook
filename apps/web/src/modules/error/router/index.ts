export default [
  {
    path: '/maintenance',
    name: 'maintenance',
    component: () => import('@/modules/error/pages/MaintenanceView.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/modules/error/pages/NotFoundView.vue'),
    meta: { public: true, last: true },
  },
]
