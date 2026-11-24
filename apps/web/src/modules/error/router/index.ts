export default [
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/modules/error/pages/NotFoundView.vue'),
    meta: { public: true, last: true },
  },
]
