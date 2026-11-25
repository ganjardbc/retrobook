<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import EntityRow from '@/components/EntityRow.vue'

defineProps<{ user: UserSummary; meta?: string; compact?: boolean }>()
</script>

<template>
  <EntityRow
    :name="user.displayName"
    :to="`/${user.username}`"
    :avatar-src="user.avatarUrl"
    :meta="meta"
    :compact="compact"
  >
    <slot />
    <template v-if="$slots.corner" #corner><slot name="corner" /></template>
  </EntityRow>
</template>
