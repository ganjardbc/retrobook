<script setup lang="ts">
import type { Profile, UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Avatar from './Avatar.vue'

const props = defineProps<{ profile: Profile; friends: UserSummary[] }>()
// PRF-04: grid enam teman (3 x 2); selengkapnya di tab Friends.
const shown = computed(() => props.friends.slice(0, 6))
</script>

<template>
  <section v-if="shown.length" class="grid" :aria-label="t('profile.friends.title')">
    <h2 class="grid__head">
      <RouterLink :to="`/${profile.username}/friends`">{{ t('profile.friends.title') }}</RouterLink>
      <span class="grid__count">{{ profile.friendCount }}</span>
    </h2>
    <ul class="grid__list">
      <li v-for="u in shown" :key="u.id" class="grid__item">
        <RouterLink :to="`/${u.username}`" class="grid__link">
          <Avatar :name="u.displayName" :src="u.avatarUrl" class="grid__avatar" />
          <span class="grid__name">{{ u.displayName }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.grid {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.grid__head {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-base);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.grid__count {
  margin-left: var(--sp-1);
  color: var(--c-text-muted);
  font-weight: normal;
}
.grid__list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin: 0;
  padding: 2px;
  list-style: none;
}
.grid__link {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
}
.grid__link:hover {
  text-decoration: none;
}
.grid__link :deep(.avatar) {
  width: 100%;
  height: 100%;
  border-radius: 0;
  font-size: var(--fs-name);
}
.grid__name {
  position: absolute;
  inset: auto 0 0 0;
  padding: var(--sp-1);
  overflow: hidden;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: var(--c-text-on-brand);
  font-size: var(--fs-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
