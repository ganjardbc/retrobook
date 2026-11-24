export default [
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/modules/legal/pages/PrivacyView.vue'),
    meta: { public: true },
  },
]
