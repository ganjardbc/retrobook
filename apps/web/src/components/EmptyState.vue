<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{ icon: string; title: string; hint?: string }>()
</script>

<template>
  <div class="empty">
    <Icon :icon="icon" class="empty__icon" aria-hidden="true" />
    <p class="empty__title">{{ title }}</p>
    <p v-if="hint" class="empty__hint">{{ hint }}</p>
    <div class="empty__cta"><slot /></div>
  </div>
</template>

<style scoped>
.empty {
  padding: var(--sp-4) var(--sp-3);
  text-align: center;
  color: var(--c-text-muted);
}
.empty__icon {
  font-size: 40px;
  color: var(--c-border);
}
.empty p {
  margin: var(--sp-1) 0 0;
}
.empty__title {
  color: var(--c-text);
  font-weight: bold;
}
.empty__cta {
  margin-top: var(--sp-2);
}
</style>
