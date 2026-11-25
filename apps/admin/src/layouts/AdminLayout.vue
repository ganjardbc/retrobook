<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/modules/auth/stores'

const route = useRoute()
const router = useRouter()
const auth = useAdminAuthStore()
const mobileNavOpen = ref(false)

type NavItem = { to: string; label: string; icon: string }
// Satu sumber untuk sidebar dan breadcrumb; kelompok mengikuti cakupan kerja admin.
const groups: { label: string; items: NavItem[] }[] = [
  { label: 'WORKSPACE', items: [{ to: '/', label: 'Ringkasan', icon: '◫' }] },
  {
    label: 'PENGGUNA',
    items: [
      { to: '/users', label: 'Pengguna', icon: '♙' },
      { to: '/bots', label: 'Bot', icon: '◎' },
    ],
  },
  {
    label: 'MODERASI',
    items: [
      { to: '/moderation', label: 'Moderasi', icon: '▤' },
      { to: '/reports', label: 'Laporan', icon: '⚑' },
      { to: '/blocked-words', label: 'Kata terlarang', icon: '⊘' },
    ],
  },
  {
    label: 'KONTEN',
    items: [
      { to: '/announcements', label: 'Pengumuman', icon: '✦' },
      { to: '/sponsored', label: 'Sponsored', icon: '★' },
      { to: '/trending', label: 'Trending', icon: '#' },
    ],
  },
  {
    label: 'SISTEM',
    items: [
      { to: '/settings', label: 'Pengaturan', icon: '⚙' },
      { to: '/audit-logs', label: 'Audit log', icon: '☰' },
    ],
  },
]
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const currentLabel = computed(
  () => groups.flatMap((g) => g.items).find((item) => isActive(item.to))?.label ?? 'Ringkasan',
)
const initials = computed(() => auth.user?.displayName?.slice(0, 1).toUpperCase() ?? 'A')

async function logout() {
  await auth.logout()
  await router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar" :class="{ 'sidebar--open': mobileNavOpen }">
      <RouterLink class="brand-lockup sidebar-brand" to="/"
        ><span class="brand-mark">r</span><span>retrobook <small>ADMIN</small></span></RouterLink
      >
      <nav class="side-nav" aria-label="Navigasi admin">
        <section v-for="group in groups" :key="group.label" class="nav-group">
          <div class="workspace-label">{{ group.label }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            class="nav-link"
            :class="{ 'nav-link--active': isActive(item.to) }"
            :to="item.to"
            ><span class="nav-icon">{{ item.icon }}</span> {{ item.label }}</RouterLink
          >
        </section>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note"><span class="status-dot" /> Semua sistem beroperasi</div>
      </div>
    </aside>
    <div v-if="mobileNavOpen" class="mobile-scrim" @click="mobileNavOpen = false" />
    <section class="shell-main">
      <header class="topbar">
        <button
          class="mobile-menu"
          aria-label="Buka navigasi"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          ☰
        </button>
        <div class="breadcrumbs">
          <span>Workspace</span><span class="crumb-sep">/</span><strong>{{ currentLabel }}</strong>
        </div>
        <div class="topbar-right">
          <span class="environment-tag"><i /> INTERNAL</span>
          <div class="profile-chip">
            <span class="avatar">{{ initials }}</span><span class="profile-name"
              >{{ auth.user?.displayName ?? 'Administrator' }}<small>Administrator</small></span
            >
          </div>
          <button class="logout-button" title="Keluar" aria-label="Keluar" @click="logout">
            ↗
          </button>
        </div>
      </header>
      <main class="page-content"><RouterView /></main>
      <footer class="admin-footer">
        <span>RETROBOOK ADMIN</span><span>Ruang aman untuk komunitas.</span>
      </footer>
    </section>
  </div>
</template>
