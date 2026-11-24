export default [
  {
    path: '/pokes',
    name: 'pokes',
    component: () => import('@/modules/pokes/pages/PokesView.vue'),
    meta: { app: true },
  },
]
