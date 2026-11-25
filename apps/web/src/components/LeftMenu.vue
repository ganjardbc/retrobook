<script setup lang="ts">
import { t, type MessageKey } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores'
import { useFriendsStore } from '@/modules/friends/stores'
import { usePokesStore } from '@/modules/pokes/stores'
import Avatar from '@/components/Avatar.vue'

// Hanya rute yang sudah ada; item lain ditambahkan bersama halamannya.
type Item = { label: MessageKey; to: string; icon: string; tone: string; count?: () => number }
const auth = useAuthStore()
const friends = useFriendsStore()
const pokes = usePokesStore()

const main: Item[] = [
  { label: 'menu.newsFeed', to: '/', icon: 'mdi:newspaper-variant-outline', tone: 'blue' },
  {
    label: 'menu.friends',
    to: '/friends',
    icon: 'mdi:account-multiple',
    tone: 'blue',
    count: () => friends.requests.length,
  },
  {
    label: 'menu.pokes',
    to: '/pokes',
    icon: 'mdi:hand-pointing-right',
    tone: 'orange',
    count: () => pokes.items.length,
  },
]
const apps: Item[] = [
  { label: 'menu.albums', to: '/albums', icon: 'mdi:image-multiple-outline', tone: 'blue' },
  { label: 'menu.groups', to: '/groups', icon: 'mdi:account-group-outline', tone: 'green' },
  { label: 'menu.events', to: '/events', icon: 'mdi:calendar-month-outline', tone: 'red' },
]

onMounted(() => {
  // Jumlah poke untuk badge menu; data akun sebelumnya dibuang lebih dulu.
  if (pokes.ownerId !== (auth.user?.id ?? null)) pokes.reset(auth.user?.id ?? null)
  void pokes.refresh()
})
const shown = (n: number) => (n > 99 ? '99+' : String(n))
</script>

<template>
  <nav class="menu" :aria-label="t('nav.menu')">
    <div v-if="auth.user" class="menu__me">
      <RouterLink :to="`/${auth.user.username}`" class="menu__avatar">
        <Avatar :name="auth.user.displayName" :src="auth.user.avatarUrl" size="m" />
      </RouterLink>
      <div class="menu__who">
        <RouterLink class="menu__name" :to="`/${auth.user.username}`">{{
          auth.user.displayName
        }}</RouterLink>
        <RouterLink class="menu__edit" to="/me/edit">{{ t('menu.editProfile') }}</RouterLink>
      </div>
    </div>

    <ul class="menu__list">
      <li v-for="item in main" :key="item.to">
        <RouterLink class="menu__row" :to="item.to" exact-active-class="menu__row--active">
          <span class="menu__ico" :class="`menu__ico--${item.tone}`"
            ><Icon :icon="item.icon" aria-hidden="true"
          /></span>
          <span class="menu__label">{{ t(item.label) }}</span>
          <span v-if="item.count && item.count() > 0" class="menu__count">{{
            shown(item.count())
          }}</span>
        </RouterLink>
      </li>
    </ul>

    <h2 class="menu__section">{{ t('menu.apps') }}</h2>
    <ul class="menu__list">
      <li v-for="item in apps" :key="item.to">
        <RouterLink class="menu__row" :to="item.to" active-class="menu__row--active">
          <span class="menu__ico" :class="`menu__ico--${item.tone}`"
            ><Icon :icon="item.icon" aria-hidden="true"
          /></span>
          <span class="menu__label">{{ t(item.label) }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.menu__me {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
  padding: 0 var(--sp-2);
}
.menu__who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.menu__name {
  color: var(--c-text);
  font-weight: bold;
  overflow-wrap: anywhere;
}
.menu__edit {
  color: var(--c-text-muted);
}
.menu__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.menu__section {
  margin: var(--sp-3) 0 var(--sp-1);
  padding: 0 var(--sp-2);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
  font-weight: bold;
  letter-spacing: 0.4px;
  text-transform: uppercase;
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
.menu__label {
  flex: 1;
  min-width: 0;
}
.menu__count {
  color: var(--c-text-muted);
  font-weight: normal;
}
.menu__ico {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  color: var(--c-text-on-brand);
  font-size: 14px;
}
.menu__ico--blue {
  background: var(--c-icon-blue);
}
.menu__ico--orange {
  background: var(--c-icon-orange);
}
.menu__ico--red {
  background: var(--c-icon-red);
}
.menu__ico--green {
  background: var(--c-icon-green);
}
</style>
