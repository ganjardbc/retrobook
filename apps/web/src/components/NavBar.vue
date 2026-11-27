<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'
import { useMobile } from '@/composables/mobile'
import { useAuthStore } from '@/modules/auth/stores'
import Avatar from '@/components/Avatar.vue'
import MenuToggle from '@/components/MenuToggle.vue'
import SearchBox from '@/modules/search/components/SearchBox.vue'
import MessagesJewel from '@/modules/chat/components/MessagesJewel.vue'
import FriendRequestsJewel from '@/modules/friends/components/FriendRequestsJewel.vue'
import NotificationsJewel from '@/modules/notifications/components/NotificationsJewel.vue'
import WordMark from '@/components/WordMark.vue'

defineProps<{ menuOpen?: boolean; drawer?: boolean; joined?: boolean }>()
defineEmits<{ 'toggle-menu': [] }>()
const auth = useAuthStore()
// Ponsel: navbar menjadi bar tab ikon rata; kotak cari ada di baris di bawah navbar (AppLayout).
const mobile = useMobile()
</script>

<template>
  <header class="navbar" :class="{ 'navbar--drawer': drawer, 'navbar--joined': joined }">
    <nav class="navbar__inner" :aria-label="t('nav.main')">
      <!-- Ponsel (gaya 2015): enam ikon dibagi rata selebar bar; tab aktif bergaris bawah putih. -->
      <template v-if="mobile && auth.user">
        <RouterLink
          class="navbar__tab"
          to="/"
          exact-active-class="navbar__tab--current"
          :aria-label="t('menu.newsFeed')"
        >
          <Icon icon="mdi:newspaper-variant-outline" aria-hidden="true" />
        </RouterLink>
        <FriendRequestsJewel />
        <MessagesJewel />
        <NotificationsJewel />
        <MenuToggle
          class="navbar__tab"
          :class="{ 'navbar__tab--current': menuOpen }"
          :open="menuOpen"
          @click="$emit('toggle-menu')"
        />
      </template>
      <template v-else>
        <!-- Hanya halaman tanpa kolom menu kiri (profil, messages) yang butuh hamburger di tablet. -->
        <MenuToggle
          v-if="drawer"
          class="navbar__menu"
          :open="menuOpen"
          @click="$emit('toggle-menu')"
        />
        <RouterLink class="navbar__brand" to="/"><WordMark variant="mark" /></RouterLink>
        <SearchBox v-if="auth.user" />
        <span class="navbar__spacer" />
        <template v-if="auth.user">
          <RouterLink class="navbar__link navbar__me" :to="`/${auth.user.username}`">
            <Avatar
              :name="auth.user.displayName"
              :src="auth.user.avatarUrl"
              size="s"
              class="navbar__avatar"
            />
            <span>{{ auth.user.displayName }}</span>
          </RouterLink>
          <RouterLink class="navbar__link navbar__home" to="/">{{ t('nav.home') }}</RouterLink>
          <div class="navbar__jewels">
            <FriendRequestsJewel />
            <MessagesJewel />
            <NotificationsJewel />
          </div>
        </template>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--h-navbar);
  background: linear-gradient(var(--c-brand-top), var(--c-brand));
  border-bottom: 1px solid var(--c-brand-edge);
  box-shadow: 0 1px 0 var(--c-border);
}
/* Ada pita berwarna sama tepat di bawah navbar (kotak cari ponsel): tanpa garis terang pemisah. */
.navbar--joined {
  box-shadow: none;
}
.navbar__inner {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  height: 100%;
  max-width: var(--w-content);
  margin: 0 auto;
  padding: 0 var(--sp-3);
}
/* Sejajar dengan kolom konten yang menyisakan ruang untuk strip chat. */
@media (min-width: 901px) {
  .navbar {
    padding-right: var(--w-chat);
  }
}
.navbar__brand {
  display: flex;
  align-items: center;
}
.navbar__brand:hover {
  text-decoration: none;
}
.navbar__spacer {
  flex: 1;
}
.navbar__link {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--c-text-on-brand);
  font: inherit;
  font-weight: bold;
}
.navbar__jewels {
  display: flex;
  align-items: center;
}
.navbar__empty {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
.navbar__brand :deep(.wordmark) {
  font-size: 27px;
}
.navbar__me span {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.navbar__avatar {
  background: var(--c-brand-dark);
  width: 24px;
  height: 24px;
  font-size: var(--fs-base);
}
.navbar__menu {
  display: none;
  padding: 0 var(--sp-2);
  border: 0;
  background: none;
  color: var(--c-text-on-brand);
  font-size: var(--fs-title);
  cursor: pointer;
}
/* Halaman tanpa kolom menu kiri (profil, messages): hamburger ikut tampil di tablet supaya menu tetap terjangkau. */
@media (max-width: 900px) {
  .navbar--drawer .navbar__menu {
    display: inline-flex;
    align-items: center;
    height: 100%;
    line-height: 1;
  }
}
/* Ponsel: bar tab ikon rata. Ikon feed, tiga jewel (langsung membuka halamannya), dan menu masing-masing
   mengisi seperlima lebar; tab aktif diberi garis bawah putih. */
@media (max-width: 640px) {
  .navbar__inner {
    gap: 0;
    padding: 0;
  }
  .navbar__inner > .navbar__tab,
  .navbar__inner > .jewel {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    justify-content: center;
    min-width: 0;
    height: 100%;
  }
  .navbar__tab {
    padding: 0;
    border: 0;
    background: none;
    color: rgba(255, 255, 255, 0.72);
    font-size: 24px;
    cursor: pointer;
  }
  .navbar__tab:hover,
  .navbar__tab--current {
    color: var(--c-text-on-brand);
  }
  .navbar__tab--current,
  .navbar__inner :deep(.jewel__btn--current) {
    box-shadow: inset 0 -3px 0 var(--c-text-on-brand);
  }
  .navbar__inner :deep(.jewel__btn) {
    justify-content: center;
    width: 100%; /* selebar sel, seperti tab lain: garis bawah tab aktif sama panjang */
    height: 100%;
    padding: 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 24px;
  }
  .navbar__inner :deep(.jewel__btn:hover),
  .navbar__inner :deep(.jewel__btn--on),
  .navbar__inner :deep(.jewel__btn--current) {
    color: var(--c-text-on-brand);
  }
  .navbar__inner :deep(.jewel__badge) {
    top: 4px;
    right: auto;
    left: calc(50% + 2px); /* di pojok kanan atas ikon */
  }
}
</style>
