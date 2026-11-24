export default [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/modules/auth/pages/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/modules/auth/pages/RegisterView.vue'),
    meta: { guest: true },
  },
]
