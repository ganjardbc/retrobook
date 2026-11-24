<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Avatar from './Avatar.vue'
import WordMark from './WordMark.vue'

defineEmits<{ 'toggle-menu': []; logout: [] }>()
const auth = useAuthStore()
// Kotak cari (T-39) dan tiga jewel (T-33) ditambahkan saat fiturnya dikerjakan.
</script>

<template>
  <header class="navbar">
    <nav class="navbar__inner" :aria-label="t('nav.main')">
      <button
        class="navbar__menu"
        type="button"
        :aria-label="t('nav.menu')"
        @click="$emit('toggle-menu')"
      >
        ☰
      </button>
      <RouterLink class="navbar__brand" to="/"><WordMark /></RouterLink>
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
        <RouterLink class="navbar__link" to="/">{{ t('nav.home') }}</RouterLink>
        <button class="navbar__link navbar__logout" type="button" @click="$emit('logout')">
          {{ t('common.logOut') }}
        </button>
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
  background: var(--c-brand);
  border-bottom: 1px solid var(--c-brand-dark);
}
.navbar__inner {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  height: 100%;
  max-width: calc(var(--w-left) + var(--w-feed) + var(--w-right) + 2 * var(--sp-3));
  margin: 0 auto;
  padding: 0 var(--sp-3);
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
.navbar__logout {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.navbar__logout:hover {
  text-decoration: underline;
}
.navbar__brand :deep(.wordmark) {
  font-size: 24px;
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
@media (max-width: 640px) {
  .navbar__menu {
    display: block;
  }
  .navbar__me span {
    display: none;
  }
}
</style>
