import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Hanya untuk tamu; member diarahkan ke beranda. */
    guest?: boolean
    /** Terbuka untuk siapa saja. */
    public?: boolean
    /** 'profile': tanpa menu kiri, lebar timeline (UI spec 3). */
    layout?: 'profile'
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../components/AppLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('../views/HomeView.vue') },
        { path: 'friends', name: 'friends', component: () => import('../views/FriendsView.vue') },
        // Harus setelah rute akar lain: `/:username` menangkap semua segmen (karena itu daftar username terlarang).
        {
          path: ':username',
          component: () => import('../views/ProfileView.vue'),
          meta: { layout: 'profile' },
          children: [
            { path: '', name: 'profile', component: () => import('../views/ProfileTimeline.vue') },
            {
              path: 'about',
              name: 'profile-about',
              component: () => import('../views/ProfileAbout.vue'),
            },
          ],
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
      meta: { public: true },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.guest) return auth.isLoggedIn ? { name: 'home' } : true
  if (to.meta.public || auth.isLoggedIn) return true
  return { name: 'login', query: { redirect: to.fullPath } }
})

/** Hanya path internal yang boleh jadi tujuan setelah login (cegah open redirect). */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
