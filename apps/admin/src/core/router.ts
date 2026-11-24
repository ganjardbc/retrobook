import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAdminAuthStore } from '@/modules/auth/stores'

const moduleRoutes = Object.values(import.meta.glob<{ default: RouteRecordRaw[] }>(
  '../modules/**/router/index.ts', { eager: true },
)).flatMap((module) => module.default)
const publicRoutes = moduleRoutes.filter((route) => !route.meta?.requiresAdmin)
const protectedRoutes = moduleRoutes.filter((route) => route.meta?.requiresAdmin)

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...publicRoutes,
    { path: '/', component: () => import('@/layouts/AdminLayout.vue'), meta: { requiresAdmin: true }, children: protectedRoutes },
    { path: '/:pathMatch(.*)*', redirect: { name: 'admin-dashboard' } },
  ],
})

router.beforeEach((to) => {
  const auth = useAdminAuthStore()
  if (to.meta.guest) return auth.isLoggedIn ? { name: 'admin-dashboard' } : true
  if (to.meta.requiresAdmin && !auth.isLoggedIn) return { name: 'admin-login', query: { redirect: to.fullPath } }
  return true
})

export function safeAdminRedirect(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
