<script setup lang="ts">
/** Baris form padat: label di kiri, kontrol di kanan. */
defineProps<{ label: string; forId?: string }>()
</script>

<template>
  <div class="row">
    <label class="row__label" :for="forId">{{ label }}</label>
    <div class="row__field"><slot /></div>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: start;
  gap: var(--sp-2);
}
.row__label {
  padding-top: var(--sp-1);
  color: var(--c-text-muted);
  font-weight: bold;
}
.row__field :deep(input:not([type='checkbox'])),
.row__field :deep(textarea) {
  width: 100%;
  box-sizing: border-box;
  padding: var(--sp-1);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  font: inherit;
}
.row__field :deep(textarea) {
  resize: none;
}
.row__field :deep(input:focus),
.row__field :deep(textarea:focus),
.row__field :deep(select:focus) {
  border-color: var(--c-brand);
  outline: 0;
}
@media (max-width: 560px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
