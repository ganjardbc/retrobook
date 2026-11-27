<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useMediaQuery, useMobile } from '@/composables/mobile'
import SearchBox from '@/modules/search/components/SearchBox.vue'
import EventsTodayCard from '@/modules/events/components/EventsTodayCard.vue'
import SuggestedGroupsCard from '@/modules/groups/components/SuggestedGroupsCard.vue'
import BirthdaysCard from '@/modules/friends/components/BirthdaysCard.vue'
import PeopleYouMayKnow from '@/modules/friends/components/PeopleYouMayKnow.vue'
import ChatDock from '@/modules/chat/components/ChatDock.vue'
import ChatSidebar from '@/modules/chat/components/ChatSidebar.vue'
import SponsoredCard from '@/modules/feed/components/SponsoredCard.vue'
import TrendingCard from '@/modules/search/components/TrendingCard.vue'
import { useChatStore } from '@/modules/chat/stores'
import { belowNavbar, stickyBottom } from '@/helpers/stickyBottom'
import { disconnectRealtime } from '@/plugins/realtime'
import AppFooter from '@/components/AppFooter.vue'
import LeftMenu from '@/components/LeftMenu.vue'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const mobile = useMobile()
const isProfile = computed(() => route.meta.layout === 'profile')
const isMessages = computed(() => route.name === 'messages')
// Ponsel: kotak cari di pita bawah navbar (Messages punya pencarian sendiri).
const showSearchBand = computed(() => mobile.value && !isMessages.value)
// Halaman form dan pengaturan: kolom kanan hanya berisi footer, tanpa kartu yang mengalihkan perhatian.
const isFocus = computed(() => route.meta.focus === true)

// Kolom samping menempel di bawah navbar dan ikut bergulir sampai dasarnya terlihat.
const stops: Array<() => void> = []
function sticky(el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) stops.push(stickyBottom(el, belowNavbar))
}

// Koneksi realtime hidup selama shell member tampil (logout atau pindah ke tamu memutusnya).
const chat = useChatStore()
onMounted(() => chat.start())
onBeforeUnmount(() => {
  stops.splice(0).forEach((stop) => stop())
  chat.stop()
  disconnectRealtime()
})

// Menu kiri di layar sempit berupa panel tarik; tutup saat pindah halaman atau menekan Escape.
router.afterEach(() => (menuOpen.value = false))
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') menuOpen.value = false
}
// Layar melebar melewati 900 px: tombol hamburger hilang, jadi laci yang masih terbuka ditutup.
const narrow = useMediaQuery('(max-width: 900px)')
watch(narrow, (isNarrow) => {
  if (!isNarrow) menuOpen.value = false
})
watch(menuOpen, (open) =>
  open ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey),
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="layout"
    :class="{ 'layout--profile': route.meta.layout === 'profile', 'layout--messages': isMessages }"
  >
    <a class="skip-link" href="#main-content">{{ t('nav.skip') }}</a>
    <NavBar
      :menu-open="menuOpen"
      :drawer="isProfile || isMessages"
      :joined="showSearchBand"
      @toggle-menu="menuOpen = !menuOpen"
    />
    <!-- Ponsel: kotak cari tetap tampil di bawah header (ikut bergulir). Messages punya pencarian sendiri. -->
    <div v-if="showSearchBand" class="layout__search"><SearchBox /></div>
    <div class="layout__body">
      <div class="layout__cols">
        <div
          v-if="menuOpen"
          class="layout__backdrop"
          aria-hidden="true"
          @click="menuOpen = false"
        />
        <!-- Messages tidak punya menu kiri di desktop; di ponsel laci tetap bisa dibuka dari navbar. -->
        <aside
          v-if="!isMessages || menuOpen"
          id="left-menu"
          :ref="sticky"
          class="layout__left"
          :class="{ 'layout__left--open': menuOpen }"
        >
          <LeftMenu />
          <!-- Strip chat tersembunyi di bawah 900 px; daftar teman tersedia di laci yang terbuka. -->
          <ChatSidebar v-if="menuOpen" inline @picked="menuOpen = false" />
        </aside>
        <main id="main-content" class="layout__main" tabindex="-1"><RouterView /></main>
        <!-- Kartu di atas, info footer di dasar kolom. -->
        <!-- Profil: kolom kanan dikosongkan dulu (tanpa footer); lebar total tetap sama. -->
        <aside v-if="!isProfile && !isMessages" :ref="sticky" class="layout__right">
          <template v-if="!isFocus">
            <TrendingCard />
            <SponsoredCard />
            <EventsTodayCard />
            <BirthdaysCard />
            <SuggestedGroupsCard v-if="route.name !== 'groups'" />
            <PeopleYouMayKnow />
          </template>
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
/* Messages: satu kolom selebar dan sepusat halaman profil, tanpa menu kiri; tinggi pas layar (kolom kanan chat tetap disisakan .layout__body). */
.layout--messages .layout__cols {
  grid-template-columns: minmax(0, 1fr);
  box-sizing: border-box;
  height: calc(100vh - var(--h-navbar));
  height: calc(100dvh - var(--h-navbar));
  min-height: 0;
  overflow: hidden;
}
.layout--messages .layout__main {
  height: 100%;
  min-height: 0;
  overflow: hidden;
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
/* Ponsel: baris kotak cari di bawah navbar, dalam alur halaman (bukan overlay). */
.layout__search {
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-brand); /* sama dengan header */
  border-bottom: 1px solid var(--c-brand-edge);
}
.layout__search :deep(.search) {
  flex: none;
  width: 100%;
  max-width: none;
}
/* Laci menu: menu kiri yang dibuka lewat tombol hamburger menjadi panel tetap (fixed) di bawah navbar,
   tidak ikut alur grid, jadi konten tidak menimpanya. Tombol hamburger hanya ada di ≤640 px, dan di
   ≤900 px pada profil dan messages (halaman yang tidak punya kolom menu kiri); kelas `--open` hanya
   muncul lewat tombol itu, jadi aturan ini aman dipasang sampai 900 px. */
.layout__backdrop {
  display: none;
}
@media (max-width: 900px) {
  /* `.layout` menaikkan spesifisitas supaya laci juga menang atas `.layout--profile .layout__left`. */
  .layout .layout__left--open {
    /* Satu area gulir: profil menempel di atas, kotak cari chat menempel di bawah, isi di antaranya
       (menu dan daftar teman) menggulir bersama. Menu dan chat memakai `display: contents` supaya anak-anaknya
       menjadi anak langsung laci dan `sticky` bekerja terhadap laci. */
    display: flex;
    flex-direction: column;
    position: fixed;
    top: var(--h-navbar);
    bottom: 0;
    left: 0;
    z-index: 9;
    align-self: stretch; /* tetap anak grid: tanpa ini `start` memendekkan laci */
    width: min(280px, 85vw);
    padding: 0 var(--sp-2);
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--c-card);
    border-right: var(--card-border);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  }
  .layout__left--open > :deep(.menu) {
    display: contents;
  }
  /* Profil menempel di atas laci (menutup isi yang menggulir di bawahnya). */
  .layout__left--open :deep(.menu__me) {
    position: sticky;
    top: 0;
    z-index: 2;
    margin: 0 calc(-1 * var(--sp-2));
    padding: var(--sp-3) var(--sp-3) var(--sp-2);
    background: var(--c-card);
    box-shadow: 0 1px 0 var(--c-border-soft);
  }
  .layout__backdrop {
    display: block;
    position: fixed;
    inset: var(--h-navbar) 0 0;
    z-index: 8;
    background: rgba(0, 0, 0, 0.35);
  }
}
@media (max-width: 640px) {
  .layout__cols {
    grid-template-columns: minmax(0, 1fr);
  }
  .layout__left {
    display: none;
  }
  /* Ponsel: laci selebar layar di bawah navbar (ikon menu ada di ujung kanan bar, jadi laci sisi kiri
     dengan celah backdrop terasa janggal); tanpa backdrop dan bayangan, baris menu 40 px (cukup untuk jari, menyisakan ruang bagi daftar chat). */
  .layout .layout__left--open {
    width: 100%;
    border-right: 0;
    box-shadow: none;
  }
  .layout__backdrop {
    display: none;
  }
  .layout__left--open > :deep(.menu .menu__row) {
    min-height: 40px;
  }
}
</style>
