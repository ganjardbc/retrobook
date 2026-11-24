export default [
  {
    path: '/',
    name: 'home',
    component: () => import('@/modules/feed/pages/HomeView.vue'),
    meta: { app: true },
  },
]
