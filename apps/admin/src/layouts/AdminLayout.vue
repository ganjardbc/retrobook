<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/modules/auth/stores'

const route = useRoute()
const router = useRouter()
const auth = useAdminAuthStore()
const mobileNavOpen = ref(false)
const initials = computed(() => auth.user?.displayName?.slice(0, 1).toUpperCase() ?? 'A')

async function logout() {
  await auth.logout()
  await router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar" :class="{ 'sidebar--open': mobileNavOpen }">
      <RouterLink class="brand-lockup sidebar-brand" to="/"><span class="brand-mark">r</span><span>retrobook <small>ADMIN</small></span></RouterLink>
      <div class="workspace-label">WORKSPACE</div>
      <nav class="side-nav" aria-label="Navigasi admin">
        <RouterLink class="nav-link" :class="{ 'nav-link--active': route.name === 'admin-dashboard' }" to="/"><span class="nav-icon">◫</span> Ringkasan</RouterLink>
        <RouterLink class="nav-link" :class="{ 'nav-link--active': route.name === 'admin-users' }" to="/users"><span class="nav-icon">♙</span> Pengguna</RouterLink>
        <RouterLink class="nav-link" :class="{ 'nav-link--active': route.path.startsWith('/moderation') }" to="/moderation"><span class="nav-icon">▤</span> Moderasi</RouterLink>
        <RouterLink class="nav-link" :class="{ 'nav-link--active': route.path.startsWith('/reports') }" to="/reports"><span class="nav-icon">⚑</span> Laporan</RouterLink>
      </nav>
      <div class="sidebar-bottom"><div class="workspace-label">SISTEM</div><RouterLink class="nav-link" :class="{ 'nav-link--active': route.path.startsWith('/announcements') }" to="/announcements"><span class="nav-icon">✦</span> Pengumuman</RouterLink><RouterLink class="nav-link" :class="{ 'nav-link--active': route.path.startsWith('/audit-logs') }" to="/audit-logs"><span class="nav-icon">☰</span> Audit log</RouterLink><RouterLink class="nav-link" :class="{ 'nav-link--active': route.path.startsWith('/bots') }" to="/bots"><span class="nav-icon">◎</span> Bot</RouterLink><RouterLink class="nav-link" :class="{ 'nav-link--active': route.path.startsWith('/blocked-words') }" to="/blocked-words"><span class="nav-icon">⊘</span> Kata terlarang</RouterLink><RouterLink class="nav-link" :class="{ 'nav-link--active': route.path.startsWith('/settings') }" to="/settings"><span class="nav-icon">⚙</span> Pengaturan</RouterLink><div class="sidebar-note"><span class="status-dot"/> Semua sistem beroperasi</div></div>
    </aside>
    <div v-if="mobileNavOpen" class="mobile-scrim" @click="mobileNavOpen = false"/>
    <section class="shell-main">
      <header class="topbar"><button class="mobile-menu" aria-label="Buka navigasi" @click="mobileNavOpen = !mobileNavOpen">☰</button><div class="breadcrumbs"><span>Workspace</span><span class="crumb-sep">/</span><strong>{{ route.path.startsWith('/moderation') ? 'Moderasi' : route.path.startsWith('/reports') ? 'Laporan' : route.path.startsWith('/blocked-words') ? 'Kata terlarang' : route.path.startsWith('/settings') ? 'Pengaturan' : route.path.startsWith('/announcements') ? 'Pengumuman' : route.path.startsWith('/audit-logs') ? 'Audit log' : route.path.startsWith('/bots') ? 'Bot' : route.path.startsWith('/users') ? 'Pengguna' : 'Ringkasan' }}</strong></div><div class="topbar-right"><span class="environment-tag"><i/> INTERNAL</span><div class="profile-chip"><span class="avatar">{{ initials }}</span><span class="profile-name">{{ auth.user?.displayName ?? 'Administrator' }}<small>Administrator</small></span></div><button class="logout-button" title="Keluar" aria-label="Keluar" @click="logout">↗</button></div></header>
      <main class="page-content"><RouterView/></main>
      <footer class="admin-footer"><span>RETROBOOK ADMIN</span><span>Ruang aman untuk komunitas.</span></footer>
    </section>
  </div>
</template>
