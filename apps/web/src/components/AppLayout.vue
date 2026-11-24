<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppFooter from './AppFooter.vue'
import LeftMenu from './LeftMenu.vue'
import NavBar from './NavBar.vue'

const auth = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)

// Menu kiri di layar sempit berupa panel tarik; tutup saat pindah halaman.
router.afterEach(() => (menuOpen.value = false))

async function logout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="layout">
    <NavBar @toggle-menu="menuOpen = !menuOpen" @logout="logout" />
    <div class="layout__cols">
      <aside class="layout__left" :class="{ 'layout__left--open': menuOpen }"><LeftMenu /></aside>
      <main class="layout__main"><RouterView /></main>
      <!-- Kolom kanan (trending, saran teman, chat) diisi di T-33, T-37, T-41. -->
      <aside class="layout__right" />
    </div>
    <AppFooter />
  </div>
</template>

<style scoped>
.layout__cols {
  display: grid;
  grid-template-columns: var(--w-left) minmax(0, var(--w-feed)) minmax(0, 1fr);
  gap: var(--sp-3);
  max-width: calc(var(--w-left) + var(--w-feed) + var(--w-right) + 2 * var(--sp-3));
  margin: 0 auto;
  padding: var(--sp-3);
}
/* UX-11: satu breakpoint di sekitar 900 px menyembunyikan kolom kanan. */
@media (max-width: 900px) {
  .layout__cols {
    grid-template-columns: var(--w-left) minmax(0, 1fr);
  }
  .layout__right {
    display: none;
  }
}
/* Di bawah 640 px menu kiri menjadi panel yang dibuka dari navbar. */
@media (max-width: 640px) {
  .layout__cols {
    grid-template-columns: minmax(0, 1fr);
  }
  .layout__left {
    display: none;
  }
  .layout__left--open {
    display: block;
    padding: var(--sp-2);
    background: var(--c-card);
    border: var(--card-border);
    border-radius: var(--radius);
  }
}
</style>
