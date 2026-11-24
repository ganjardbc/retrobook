<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'

// PRF-05: panel tahun di kanan timeline; memilih tahun menampilkan post tahun itu, "Recent" kembali ke semua.
defineProps<{ years: number[]; selected: number | null }>()
const emit = defineEmits<{ select: [year: number | null] }>()
</script>

<template>
  <nav class="years" :aria-label="t('profile.years.label')">
    <button
      type="button"
      class="years__item"
      :aria-current="selected === null ? 'true' : undefined"
      @click="emit('select', null)"
    >
      {{ t('profile.years.recent') }}
    </button>
    <button
      v-for="y in years"
      :key="y"
      type="button"
      class="years__item"
      :aria-current="selected === y ? 'true' : undefined"
      @click="emit('select', y)"
    >
      {{ y }}
    </button>
  </nav>
</template>

<style scoped>
.years {
  position: sticky;
  top: calc(var(--h-navbar) + var(--sp-3));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-1);
  padding-left: var(--sp-2);
  border-left: 2px solid var(--c-border);
}
.years__item {
  padding: var(--sp-1) var(--sp-2);
  color: var(--c-link);
  background: none;
  border: 0;
  font: inherit;
  cursor: pointer;
}
.years__item:hover {
  background: var(--c-hover-bg);
}
.years__item[aria-current='true'] {
  color: var(--c-text);
  font-weight: bold;
}
@media (max-width: 900px) {
  .years {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0;
    border-left: 0;
  }
}
</style>
