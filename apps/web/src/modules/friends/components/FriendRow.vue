<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'

defineProps<{ user: UserSummary }>()
</script>

<template>
  <li class="row">
    <Avatar :name="user.displayName" :src="user.avatarUrl" size="m" />
    <div class="row__who">
      <RouterLink class="row__name" :to="`/${user.username}`">{{ user.displayName }}</RouterLink>
    </div>
    <div class="row__actions"><slot /></div>
  </li>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
}
.row:first-child {
  border-top: 0;
}
.row__who {
  flex: 1;
  min-width: 0;
}
.row__name {
  font-weight: bold;
}
.row__actions {
  display: flex;
  gap: var(--sp-2);
}
</style>
