<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComponentPublicInstance } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import EventsTodayCard from '@/modules/events/components/EventsTodayCard.vue'
import SuggestedGroupsCard from '@/modules/groups/components/SuggestedGroupsCard.vue'
import BirthdaysCard from '@/modules/friends/components/BirthdaysCard.vue'
import PeopleYouMayKnow from '@/modules/friends/components/PeopleYouMayKnow.vue'
import ChatDock from '@/modules/chat/components/ChatDock.vue'
import ChatSidebar from '@/modules/chat/components/ChatSidebar.vue'
import SponsoredCard from '@/modules/feed/components/SponsoredCard.vue'
import TrendingCard from '@/modules/search/components/TrendingCard.vue'
import { useChatStore } from '@/modules/chat/stores'
import { stickyBottom } from '@/helpers/stickyBottom'
import { disconnectRealtime } from '@/plugins/realtime'
import AppFooter from '@/components/AppFooter.vue'
import LeftMenu from '@/components/LeftMenu.vue'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const isProfile = computed(() => route.meta.layout === 'profile')

// Kolom samping menempel di bawah navbar dan ikut bergulir sampai dasarnya terlihat.
const stickyTop = () => (document.querySelector('.navbar')?.clientHeight ?? 0) + 12 // 12 = --sp-3
const stops: Array<() => void> = []
function sticky(el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) stops.push(stickyBottom(el, stickyTop))
}

// Koneksi realtime hidup selama shell member tampil (logout atau pindah ke tamu memutusnya).
const chat = useChatStore()
onMounted(() => chat.start())
onBeforeUnmount(() => {
  stops.splice(0).forEach((stop) => stop())
  chat.stop()
  disconnectRealtime()
})

// Menu kiri di layar sempit berupa panel tarik; tutup saat pindah halaman.
router.afterEach(() => (menuOpen.value = false))
</script>

<template>
  <div class="layout" :class="{ 'layout--profile': route.meta.layout === 'profile' }">
    <NavBar @toggle-menu="menuOpen = !menuOpen" />
    <div class="layout__body">
      <div class="layout__cols">
        <aside :ref="sticky" class="layout__left" :class="{ 'layout__left--open': menuOpen }">
          <LeftMenu />
        </aside>
        <main class="layout__main"><RouterView /></main>
        <!-- Kartu di atas, info footer di dasar kolom. -->
        <!-- Profil: kolom kanan dikosongkan dulu (tanpa footer); lebar total tetap sama. -->
        <aside v-if="!isProfile" :ref="sticky" class="layout__right">
          <TrendingCard />
          <SponsoredCard />
          <EventsTodayCard />
          <BirthdaysCard />
          <SuggestedGroupsCard v-if="route.name !== 'groups'" />
          <PeopleYouMayKnow />
          <AppFooter class="layout__footer" />
        </aside>
      </div>
    </div>
    <!-- Strip chat menempel di tepi kanan layar, di luar kolom (referensi profil Maret 2015). -->
    <ChatSidebar />
    <ChatDock />
  </div>
</template>

<style scoped>
.layout__cols {
  display: grid;
  grid-template-columns: var(--w-left) minmax(0, var(--w-feed)) minmax(0, 1fr);
  gap: var(--sp-3);
  max-width: var(--w-content);
  margin: 0 auto;
  padding: var(--sp-3);
}
/* Profil: tanpa menu kiri, lebar total tetap sama dengan halaman lain. */
.layout--profile .layout__cols {
  grid-template-columns: minmax(0, 1fr);
}
.layout--profile .layout__left {
  display: none;
}
.layout__footer {
  flex-direction: column;
  align-items: flex-start;
  padding: var(--sp-2) 0;
  text-align: left;
}
/* Strip chat tetap di kanan: sisakan ruangnya supaya konten tidak tertutup. */
@media (min-width: 901px) {
  .layout__body {
    padding-right: var(--w-chat);
  }
}
/* Kolom kiri dan kanan menempel mengikuti scroll window; --sticky-top diisi helpers/stickyBottom. */
.layout__left,
.layout__right {
  position: sticky;
  top: var(--sticky-top, calc(var(--h-navbar) + var(--sp-3)));
  align-self: start;
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
