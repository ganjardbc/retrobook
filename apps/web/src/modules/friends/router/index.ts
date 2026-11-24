export default [
  {
    path: '/friends',
    name: 'friends',
    component: () => import('@/modules/friends/pages/FriendsView.vue'),
    meta: { app: true },
  },
]
