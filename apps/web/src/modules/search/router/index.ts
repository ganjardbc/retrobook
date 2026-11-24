export default [
  {
    path: '/search',
    name: 'search',
    component: () => import('@/modules/search/pages/SearchView.vue'),
    meta: { app: true },
  },
]
