<script setup lang="ts">
import { t, type MessageKey } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores'
import Avatar from '@/components/Avatar.vue'

// Hanya rute yang sudah ada; item lain (Messages, Friends, ...) ditambahkan bersama halamannya.
const items: { label: MessageKey; to: string }[] = [
  { label: 'menu.newsFeed', to: '/' },
  { label: 'menu.friends', to: '/friends' },
  { label: 'menu.pokes', to: '/pokes' },
  { label: 'menu.albums', to: '/albums' },
  { label: 'menu.groups', to: '/groups' },
  { label: 'menu.events', to: '/events' },
]
const auth = useAuthStore()
</script>

<template>
  <nav class="menu" :aria-label="t('nav.menu')">
    <RouterLink v-if="auth.user" class="menu__row menu__me" :to="`/${auth.user.username}`">
      <Avatar :name="auth.user.displayName" :src="auth.user.avatarUrl" size="s" />
      <strong>{{ auth.user.displayName }}</strong>
    </RouterLink>
    <ul class="menu__list">
      <li v-for="item in items" :key="item.to">
        <RouterLink class="menu__row" :to="item.to" exact-active-class="menu__row--active">
          {{ t(item.label) }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.menu__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.menu__row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 28px;
  padding: var(--sp-1) var(--sp-2);
  color: var(--c-text);
  text-decoration: none;
}
.menu__row:hover {
  background: var(--c-hover-bg);
  text-decoration: none;
}
.menu__row--active {
  background: var(--c-border-soft);
  font-weight: bold;
}
.menu__me {
  margin-bottom: var(--sp-2);
}
</style>
