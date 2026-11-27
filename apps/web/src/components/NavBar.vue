<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores'
import Avatar from '@/components/Avatar.vue'
import SearchBox from '@/modules/search/components/SearchBox.vue'
import MessagesJewel from '@/modules/chat/components/MessagesJewel.vue'
import FriendRequestsJewel from '@/modules/friends/components/FriendRequestsJewel.vue'
import NotificationsJewel from '@/modules/notifications/components/NotificationsJewel.vue'
import WordMark from '@/components/WordMark.vue'

defineProps<{ menuOpen?: boolean; drawer?: boolean }>()
defineEmits<{ 'toggle-menu': [] }>()
const auth = useAuthStore()
</script>

<template>
  <header class="navbar" :class="{ 'navbar--drawer': drawer }">
    <nav class="navbar__inner" :aria-label="t('nav.main')">
      <button
        class="navbar__menu"
        type="button"
        :aria-label="t('nav.menu')"
        aria-controls="left-menu"
        :aria-expanded="menuOpen"
        @click="$emit('toggle-menu')"
      >
        <Icon icon="mdi:menu" aria-hidden="true" />
      </button>
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
/* Ponsel: menu dan logo di kiri, jewel di kanan (spacer mendorongnya). Kotak cari pindah ke laci
   menu (AppLayout); Home tetap lewat logo. */
@media (max-width: 640px) {
  .navbar__menu {
    display: inline-flex;
    align-items: center;
    height: 100%;
    line-height: 1;
  }
  .navbar__me,
  .navbar__home,
  .navbar :deep(.search) {
    display: none;
  }
  .navbar__inner {
    gap: var(--sp-2);
  }
}
</style>
