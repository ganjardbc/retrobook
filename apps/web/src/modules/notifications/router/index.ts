export default [
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('@/modules/notifications/pages/NotificationsView.vue'),
    meta: { app: true },
  },
]
