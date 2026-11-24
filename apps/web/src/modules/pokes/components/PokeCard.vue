<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'

defineProps<{ user: UserSummary }>()
defineEmits<{ 'poke-back': []; remove: [] }>()
</script>

<template>
  <li class="poke">
    <Avatar :name="user.displayName" :src="user.avatarUrl" size="m" />
    <div class="poke__body">
      <p class="poke__text">
        <RouterLink class="poke__name" :to="`/${user.username}`">{{ user.displayName }}</RouterLink>
        {{ t('pokes.text') }}
      </p>
      <p class="poke__actions">
        <button class="poke__link" type="button" @click="$emit('poke-back')">
          {{ t('pokes.pokeBack') }}
        </button>
        ·
        <button class="poke__link" type="button" @click="$emit('remove')">
          {{ t('pokes.remove') }}
        </button>
      </p>
    </div>
  </li>
</template>

<style scoped>
.poke {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
}
.poke:first-child {
  border-top: 0;
}
.poke__body {
  flex: 1;
  min-width: 0;
}
.poke__text,
.poke__actions {
  margin: 0;
}
.poke__name {
  font-weight: bold;
}
.poke__actions {
  margin-top: var(--sp-1);
  color: var(--c-text-muted);
}
.poke__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.poke__link:hover {
  text-decoration: underline;
}
</style>
