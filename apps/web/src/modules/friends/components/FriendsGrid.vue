<script setup lang="ts">
import type { Profile, UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import PageCard from '@/components/PageCard.vue'

const props = defineProps<{ profile: Profile; friends: UserSummary[] }>()
// PRF-04: grid enam teman (3 x 2); selengkapnya di tab Friends.
const shown = computed(() => props.friends.slice(0, 6))
</script>

<template>
  <PageCard v-if="shown.length" :title="t('profile.friends.title')" heading="h2" flush>
    <template #title>
      <h2 class="pcard__title">
        <RouterLink :to="`/${profile.username}/friends`">
          {{ t('profile.friends.title') }}
        </RouterLink>
        <span class="grid__count">{{ profile.friendCount }}</span>
      </h2>
    </template>
    <ul class="grid__list" :aria-label="t('profile.friends.title')">
      <li v-for="u in shown" :key="u.id" class="grid__item">
        <RouterLink :to="`/${u.username}`" class="grid__link">
          <Avatar :name="u.displayName" :src="u.avatarUrl" class="grid__avatar" />
          <span class="grid__name">{{ u.displayName }}</span>
        </RouterLink>
      </li>
    </ul>
  </PageCard>
</template>

<style scoped>
.pcard__title a {
  color: var(--c-brand);
  text-decoration: none;
}
.pcard__title {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: bold;
}
.grid__count {
  margin-left: var(--sp-1);
  font-weight: normal;
  color: var(--c-text-muted);
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
