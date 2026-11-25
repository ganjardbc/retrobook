<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

export type IconOption = { value: string; label: string; icon: string }
const props = defineProps<{ modelValue: string; options: IconOption[]; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const current = computed(() => props.options.find((o) => o.value === props.modelValue))
</script>

<template>
  <span class="isel">
    <Icon v-if="current" :icon="current.icon" aria-hidden="true" />
    <select
      :value="modelValue"
      :aria-label="label"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
  </span>
</template>

<style scoped>
.isel {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  color: var(--c-text-muted);
}
.isel select {
  padding: var(--sp-1);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  background: var(--c-card);
  color: var(--c-text);
  font: inherit;
}
</style>
