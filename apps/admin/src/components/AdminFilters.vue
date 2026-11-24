<script setup lang="ts">
export type FilterOption = { label: string; value: string }
export type FilterDefinition = { key: string; label: string; placeholder?: string; options?: FilterOption[] }
withDefaults(defineProps<{ filterDefinitions: FilterDefinition[]; searchPlaceholder?: string; searchLabel?: string }>(), { searchPlaceholder: 'Cari…', searchLabel: 'Pencarian' })
const search = defineModel<string>('search', { default: '' })
const values = defineModel<Record<string, string>>('filters', { default: () => ({}) })
const emit = defineEmits<{ reset: [] }>()
function clear() { search.value = ''; values.value = {}; emit('reset') }
</script>

<template>
  <div class="filter-bar">
    <label class="search-field"><span class="sr-only">{{ searchLabel }}</span><span class="search-icon">⌕</span><input v-model="search" type="search" :placeholder="searchPlaceholder" @keydown.enter.prevent/></label>
    <label v-for="filter in filterDefinitions" :key="filter.key" class="select-field"><span class="sr-only">{{ filter.label }}</span><select v-model="values[filter.key]" :aria-label="filter.label"><option value="">{{ filter.placeholder ?? filter.label }}</option><option v-for="option in filter.options ?? []" :key="option.value" :value="option.value">{{ option.label }}</option></select><span class="select-arrow">⌄</span></label>
    <button v-if="search || Object.values(values).some(Boolean)" class="clear-filters" @click="clear">Reset filter</button>
    <slot/>
  </div>
</template>
