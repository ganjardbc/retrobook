<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, type MessageKey } from '@retrobook/shared/i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/modules/auth/stores'

const route = useRoute()
const router = useRouter()
const auth = useAdminAuthStore()
const mobileNavOpen = ref(false)

type NavItem = { to: string; label: MessageKey; icon: string }
// Satu sumber untuk sidebar dan breadcrumb; kelompok mengikuti cakupan kerja admin.
const groups: { label: MessageKey; items: NavItem[] }[] = [
  {
    label: 'admin.nav.group.workspace',
    items: [{ to: '/', label: 'admin.nav.overview', icon: '◫' }],
  },
  {
    label: 'admin.nav.group.users',
    items: [
      { to: '/users', label: 'admin.nav.users', icon: '♙' },
      { to: '/bots', label: 'admin.nav.bots', icon: '◎' },
    ],
  },
  {
    label: 'admin.nav.group.moderation',
    items: [
      { to: '/moderation', label: 'admin.nav.moderation', icon: '▤' },
      { to: '/reports', label: 'admin.nav.reports', icon: '⚑' },
      { to: '/blocked-words', label: 'admin.nav.blockedWords', icon: '⊘' },
    ],
  },
  {
    label: 'admin.nav.group.content',
    items: [
      { to: '/announcements', label: 'admin.nav.announcements', icon: '✦' },
      { to: '/sponsored', label: 'admin.nav.sponsored', icon: '★' },
      { to: '/trending', label: 'admin.nav.trending', icon: '#' },
    ],
  },
  {
    label: 'admin.nav.group.system',
    items: [
      { to: '/settings', label: 'admin.nav.settings', icon: '⚙' },
      { to: '/audit-logs', label: 'admin.nav.auditLogs', icon: '☰' },
    ],
  },
]
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const currentLabel = computed(
  () =>
    groups.flatMap((g) => g.items).find((item) => isActive(item.to))?.label ?? 'admin.nav.overview',
)
const initials = computed(() => auth.user?.displayName?.slice(0, 1).toUpperCase() ?? 'A')

async function logout() {
  try {
    await auth.logout()
  } catch {
    /* sesi lokal sudah dibersihkan oleh store; tetap arahkan ke login */
  }
  await router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar" :class="{ 'sidebar--open': mobileNavOpen }">
      <RouterLink class="brand-lockup sidebar-brand" to="/"
        ><span class="brand-mark">r</span><span>retrobook <small>ADMIN</small></span></RouterLink
      >
      <nav class="side-nav" :aria-label="t('admin.nav.aria')">
        <section v-for="group in groups" :key="group.label" class="nav-group">
          <div class="workspace-label">{{ t(group.label) }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            class="nav-link"
            :class="{ 'nav-link--active': isActive(item.to) }"
            :to="item.to"
            ><span class="nav-icon">{{ item.icon }}</span> {{ t(item.label) }}</RouterLink
          >
        </section>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note"><span class="status-dot" /> {{ t('admin.nav.systemOk') }}</div>
      </div>
    </aside>
    <div v-if="mobileNavOpen" class="mobile-scrim" @click="mobileNavOpen = false" />
    <section class="shell-main">
      <header class="topbar">
        <button
          class="mobile-menu"
          :aria-label="t('admin.nav.open')"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          ☰
        </button>
        <div class="breadcrumbs">
          <span>{{ t('admin.nav.group.workspace') }}</span><span class="crumb-sep">/</span
          ><strong>{{ t(currentLabel) }}</strong>
        </div>
        <div class="topbar-right">
          <span class="environment-tag"><i /> {{ t('admin.layout.internal') }}</span>
          <div class="profile-chip">
            <span class="avatar">{{ initials }}</span><span class="profile-name"
              >{{ auth.user?.displayName ?? t('admin.layout.administrator')
              }}<small>{{ t('admin.layout.administrator') }}</small></span
            >
          </div>
          <div class="topbar-actions">
            <LanguageSwitcher />
            <button
              class="logout-button"
              :title="t('common.logOut')"
              :aria-label="t('common.logOut')"
              @click="logout"
            >
              <svg
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main class="page-content"><RouterView /></main>
      <footer class="admin-footer">
        <span>RETROBOOK ADMIN</span><span>{{ t('admin.layout.tagline') }}</span>
      </footer>
    </section>
  </div>
</template>
