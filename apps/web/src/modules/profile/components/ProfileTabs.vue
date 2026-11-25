<script setup lang="ts">
import type { Profile } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'

defineProps<{ profile: Profile }>()
// Tab More (Notes, Albums, Events) menunggu Fase 3.
</script>

<template>
  <nav class="tabs" :aria-label="t('profile.tabs')">
    <RouterLink
      class="tabs__tab"
      :to="`/${profile.username}`"
      exact-active-class="tabs__tab--active"
    >
      {{ t('profile.tab.timeline') }}
    </RouterLink>
    <RouterLink
      class="tabs__tab"
      :to="`/${profile.username}/about`"
      exact-active-class="tabs__tab--active"
    >
      {{ t('profile.tab.about') }}
    </RouterLink>
    <RouterLink
      class="tabs__tab"
      :to="`/${profile.username}/friends`"
      exact-active-class="tabs__tab--active"
    >
      {{ t('profile.tab.friends') }} <span class="tabs__count">{{ profile.friendCount }}</span>
    </RouterLink>
    <RouterLink
      class="tabs__tab"
      :to="`/${profile.username}/photos`"
      exact-active-class="tabs__tab--active"
    >
      {{ t('profile.tab.photos') }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabs {
  display: flex;
  background: var(--c-card);
  border: var(--card-border);
  border-top: 0;
  /* Foto profil menimpa tepi kiri bar tab (referensi profil Maret 2015): tab mulai di kanan foto. */
  padding-left: calc(var(--avatar-l) + 2 * var(--sp-4) + var(--sp-3));
}
@media (max-width: 640px) {
  .tabs {
    padding-left: 0;
    margin-top: var(--sp-5);
    overflow-x: auto;
  }
}
.tabs__tab {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 3px solid transparent;
  color: var(--c-text);
  font-size: var(--fs-post);
  font-weight: bold;
  text-decoration: none;
}
.tabs__tab:hover {
  text-decoration: none;
  background: var(--c-hover-bg);
}
.tabs__tab--active {
  border-bottom-color: var(--c-brand);
  color: var(--c-text);
}
.tabs__tab--off {
  color: var(--c-text-muted);
  cursor: default;
}
.tabs__tab--off:hover {
  background: none;
}
.tabs__count {
  font-weight: normal;
  font-size: var(--fs-base);
}
</style>
