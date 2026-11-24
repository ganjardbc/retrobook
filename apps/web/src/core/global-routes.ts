import { useAuthStore } from '@/modules/auth/stores'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Hanya untuk tamu; member diarahkan ke beranda. */
    guest?: boolean
    /** Terbuka untuk siapa saja. */
    public?: boolean
    /** Dipasang di dalam AppLayout (navbar + kolom). */
    app?: boolean
    /** Selalu didaftarkan paling akhir (404). */
    last?: boolean
    /** 'profile': tanpa menu kiri, lebar timeline (UI spec 3). */
    layout?: 'profile'
  }
}

// Setiap modul mengekspor rutenya sendiri di modules/<fitur>/router/index.ts.
const found = import.meta.glob<{ default: RouteRecordRaw[] }>('../modules/**/router/index.ts', {
  eager: true,
})
const all = Object.values(found).flatMap((m) => m.default)

// Rute dinamis di akar (`/:username`) harus setelah rute akar statis, apa pun urutan glob-nya.
const isDynamic = (r: RouteRecordRaw) => r.path.startsWith('/:')
const rank = (r: RouteRecordRaw) => (r.meta?.last ? 2 : isDynamic(r) ? 1 : 0)
const ordered = [...all].sort((a, b) => rank(a) - rank(b))

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: ordered.filter((r) => r.meta?.app),
  },
  ...ordered.filter((r) => !r.meta?.app),
]

export const router = createRouter({ history: createWebHistory(), routes })

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
