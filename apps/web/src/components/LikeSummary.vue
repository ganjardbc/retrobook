<script setup lang="ts">
import type { Post } from '@retrobook/shared'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { likeSummaryParts } from '../utils/like-summary'

const props = defineProps<{ post: Post }>()
const auth = useAuthStore()
const parts = computed(() => likeSummaryParts(props.post, auth.user?.id ?? null))
</script>

<template>
  <p v-if="parts.length" class="likes">
    <span class="likes__icon" aria-hidden="true">👍</span>
    <template v-for="(part, i) in parts" :key="i">
      <RouterLink v-if="part.username" :to="`/${part.username}`">{{ part.text }}</RouterLink>
      <template v-else>{{ part.text }}</template>
    </template>
  </p>
</template>

<style scoped>
.likes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--sp-1);
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
  background: var(--c-card-subtle);
}
.likes__icon {
  margin-right: var(--sp-1);
}
</style>
