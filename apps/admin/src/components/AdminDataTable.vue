<script setup lang="ts">
export type TableColumn<T> = {
  key: keyof T | string
  label: string
  align?: 'left' | 'right'
  width?: string
}
const props = withDefaults(
  defineProps<{
    columns: TableColumn<Record<string, unknown>>[]
    rows: Record<string, unknown>[]
    rowKey?: string
    loading?: boolean
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    rowKey: 'id',
    loading: false,
    emptyTitle: 'Belum ada data',
    emptyDescription: 'Data akan muncul di sini setelah tersedia.',
  },
)

const emit = defineEmits<{ rowClick: [row: Record<string, unknown>] }>()
function cell(row: Record<string, unknown>, key: string | number | symbol) {
  return row[String(key)]
}
</script>

<template>
  <div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="String(column.key)"
            :class="`align-${column.align ?? 'left'}`"
            :style="{ width: column.width }"
          >
            {{ column.label }}
          </th>
          <th v-if="$slots.actions" class="align-right">Aksi</th>
        </tr>
      </thead>
      <tbody v-if="rows.length && !loading">
        <tr v-for="row in rows" :key="String(row[rowKey])" @click="emit('rowClick', row)">
          <td v-for="column in columns" :key="String(column.key)">
            <slot :name="`cell-${String(column.key)}`" :row="row" :value="cell(row, column.key)">{{
              cell(row, column.key)
            }}</slot>
          </td>
          <td v-if="$slots.actions" class="align-right"><slot name="actions" :row="row" /></td>
        </tr>
      </tbody>
    </table>
    <div v-if="loading" class="table-state">
      <span class="loader" /><strong>Memuat data…</strong>
    </div>
    <div v-else-if="!rows.length" class="table-state">
      <span class="empty-icon">⌕</span><strong>{{ emptyTitle }}</strong>
      <p>{{ emptyDescription }}</p>
      <slot name="empty-action" />
    </div>
  </div>
</template>
