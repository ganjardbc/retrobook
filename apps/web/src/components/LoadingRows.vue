<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'

withDefaults(defineProps<{ rows?: number }>(), { rows: 3 })
</script>

<template>
  <div class="skel" role="status">
    <span class="visually-hidden">{{ t('common.loading') }}</span>
    <div v-for="n in rows" :key="n" class="skel__row" aria-hidden="true">
      <span class="skel__avatar" />
      <span class="skel__lines"><i /><i /></span>
    </div>
  </div>
</template>

<style scoped>
.skel__row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
}
.skel__avatar {
  flex: none;
  width: 40px;
  height: 40px;
  background: var(--c-card-subtle);
  border-radius: var(--radius);
}
.skel__lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--sp-1);
}
.skel__lines i {
  display: block;
  height: 10px;
  background: var(--c-card-subtle);
  border-radius: var(--radius);
}
.skel__lines i:last-child {
  width: 60%;
}
.skel__avatar,
.skel__lines i {
  animation: skel-pulse 1.2s ease-in-out infinite;
}
@keyframes skel-pulse {
  50% {
    opacity: 0.4;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skel__avatar,
  .skel__lines i {
    animation: none;
  }
}
</style>
