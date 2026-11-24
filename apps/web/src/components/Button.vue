<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'success' | 'default'
    type?: 'button' | 'submit'
    disabled?: boolean
    /** Bila diisi, dirender sebagai tautan bergaya tombol. */
    to?: RouteLocationRaw
  }>(),
  { variant: 'primary', type: 'button', disabled: false, to: undefined },
)
</script>

<template>
  <RouterLink v-if="to" :to="to" class="btn" :class="`btn--${variant}`"><slot /></RouterLink>
  <button v-else class="btn" :class="`btn--${variant}`" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 var(--sp-3);
  border: 1px solid transparent;
  border-radius: var(--radius);
  font: inherit;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
}
.btn:hover {
  text-decoration: none;
}
.btn:focus-visible {
  outline: 2px solid var(--c-brand);
  outline-offset: 1px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn--primary {
  background: var(--c-brand);
  border-color: var(--c-brand-dark);
  color: var(--c-text-on-brand);
}
.btn--primary:hover:not(:disabled) {
  background: var(--c-brand-dark);
}
.btn--success {
  background: var(--c-success);
  border-color: var(--c-success-dark);
  color: var(--c-text-on-brand);
}
.btn--success:hover:not(:disabled) {
  background: var(--c-success-dark);
}
.btn--default {
  background: var(--c-card-subtle);
  border-color: var(--c-input-border);
  color: var(--c-text);
}
.btn--default:hover:not(:disabled) {
  background: var(--c-hover-bg);
}
</style>
