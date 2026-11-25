<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ iso: string }>()
const date = computed(() => new Date(props.iso))
const month = computed(() => date.value.toLocaleDateString([], { month: 'short' }).toUpperCase())
</script>

<template>
  <div class="badge" aria-hidden="true">
    <span class="badge__month">{{ month }}</span>
    <span class="badge__day">{{ date.getDate() }}</span>
  </div>
</template>

<style scoped>
.badge {
  flex: none;
  width: 44px;
  overflow: hidden;
  text-align: center;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
}
.badge__month {
  display: block;
  background: var(--c-danger);
  color: var(--c-text-on-brand);
  font-size: 10px;
  font-weight: bold;
  line-height: 14px;
}
.badge__day {
  display: block;
  font-size: 20px;
  font-weight: bold;
  line-height: 28px;
}
</style>
