<script setup lang="ts">
import type { Profile } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'

defineProps<{ profile: Profile }>()
// Friends, Photos, dan More menunggu T-24; ditampilkan redup agar bentuk tab sesuai referensi.
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
    <span class="tabs__tab tabs__tab--off" aria-disabled="true">
      {{ t('profile.tab.friends') }} <span class="tabs__count">{{ profile.friendCount }}</span>
    </span>
    <span class="tabs__tab tabs__tab--off" aria-disabled="true">{{ t('profile.tab.photos') }}</span>
  </nav>
</template>

<style scoped>
.tabs {
  display: flex;
  background: var(--c-card);
  border: var(--card-border);
  border-top: 0;
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
