<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
export type TableColumn<T> = {
  key: keyof T | string
  label: string
  align?: 'left' | 'right'
  width?: string
}
withDefaults(
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
    emptyTitle: undefined,
    emptyDescription: undefined,
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
          <th v-if="$slots.actions" class="align-right">{{ t('admin.table.actions') }}</th>
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
      <span class="loader" /><strong>{{ t('admin.table.loading') }}</strong>
    </div>
    <div v-else-if="!rows.length" class="table-state">
      <span class="empty-icon">⌕</span
      ><strong>{{ emptyTitle ?? t('admin.table.emptyTitle') }}</strong>
      <p>{{ emptyDescription ?? t('admin.table.emptyDescription') }}</p>
      <slot name="empty-action" />
    </div>
  </div>
</template>
