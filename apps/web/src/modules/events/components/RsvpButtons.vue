<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import Button from '@/components/Button.vue'
import type { RsvpStatus } from '../services/api'

const STATUSES: RsvpStatus[] = ['GOING', 'MAYBE', 'DECLINED']
defineProps<{ current: RsvpStatus | null }>()
defineEmits<{ set: [status: RsvpStatus] }>()
</script>

<template>
  <div class="rsvp" role="group">
    <Button
      v-for="status in STATUSES"
      :key="status"
      :variant="current === status ? 'primary' : 'default'"
      :aria-pressed="current === status"
      @click="$emit('set', status)"
      >{{ t(`event.rsvp.${status}`) }}</Button
    >
  </div>
</template>

<style scoped>
.rsvp {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}
</style>
