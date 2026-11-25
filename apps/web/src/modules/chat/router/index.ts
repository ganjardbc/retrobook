export default [
  {
    path: '/messages',
    name: 'messages',
    component: () => import('@/modules/chat/pages/MessagesView.vue'),
    meta: { app: true, focus: true },
  },
]
