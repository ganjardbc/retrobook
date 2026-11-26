<script setup lang="ts">
import { intlLocale, t } from '@retrobook/shared/i18n'
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminDataTable, { type TableColumn } from '@/components/AdminDataTable.vue'
import AdminFilters from '@/components/AdminFilters.vue'
import { useUserStore } from '@/modules/user/stores'
import type { AdminUser } from '@/modules/user/services/types'

const users = useUserStore()
const router = useRouter()
const columns = computed<TableColumn<Record<string, unknown>>[]>(() => [
  { key: 'person', label: t('admin.users.col.user') },
  { key: 'role', label: t('admin.users.col.role'), width: '120px' },
  { key: 'status', label: t('admin.common.status').toUpperCase(), width: '140px' },
  { key: 'createdAt', label: t('admin.users.col.joined'), width: '150px' },
])
const filterDefinitions = computed(() => [
  {
    key: 'status',
    label: t('admin.common.status'),
    options: [
      { label: t('admin.user.status.ACTIVE'), value: 'ACTIVE' },
      { label: t('admin.user.status.SUSPENDED'), value: 'SUSPENDED' },
      { label: t('admin.user.status.BANNED'), value: 'BANNED' },
    ],
  },
  {
    key: 'role',
    label: t('admin.users.col.role'),
    options: [
      { label: t('admin.user.role.USER'), value: 'USER' },
      { label: t('admin.user.role.ADMIN'), value: 'ADMIN' },
    ],
  },
])
let debounce: ReturnType<typeof setTimeout>
onMounted(() => void users.fetchUsers())
watch([() => users.search, () => users.filters.status, () => users.filters.role], () => {
  clearTimeout(debounce)
  users.resetPagination()
  debounce = setTimeout(() => void users.fetchUsers(), 250)
})
function openUser(row: Record<string, unknown>) {
  void router.push({ name: 'admin-users-detail', params: { id: String(row.id) } })
}
function date(value: unknown) {
  return new Date(String(value)).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
function user(row: Record<string, unknown>) {
  return row as unknown as AdminUser
}
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.users.eyebrow') }}</p>
      <h1>{{ t('admin.nav.users') }}</h1>
      <p class="page-description">{{ t('admin.users.description') }}</p>
    </div>
  </div>
  <section class="surface-card users-card">
    <div class="card-toolbar">
      <div>
        <h2>{{ t('admin.users.all') }}</h2>
        <p>{{ t('admin.users.allNote') }}</p>
      </div>
      <span class="result-count">{{
        t('admin.users.total', { count: users.total.toLocaleString(intlLocale()) })
      }}</span>
    </div>
    <AdminFilters
      v-model:search="users.search"
      v-model:filters="users.filters"
      :search-placeholder="t('admin.users.searchPlaceholder')"
      :filter-definitions="filterDefinitions"
      @reset="users.resetFilters"
    />
    <p v-if="users.error" class="user-error" role="alert">
      {{ users.error }} <button @click="users.fetchUsers">{{ t('admin.common.retry') }}</button>
    </p>
    <AdminDataTable
      :columns="columns"
      :rows="users.users as unknown as Record<string, unknown>[]"
      :loading="users.loading"
      :empty-title="t('admin.users.empty')"
      :empty-description="t('admin.users.emptyHint')"
      @row-click="openUser"
    >
      <template #cell-person="{ row }"
        ><div class="user-person">
          <span class="user-avatar">{{
            String(row.displayName || row.username)
              .slice(0, 1)
              .toUpperCase()
          }}</span><span
            ><strong>{{ row.displayName }}</strong
            ><small>@{{ row.username }} · {{ row.email }}</small></span
          ><i v-if="user(row).isBot" class="bot-tag">BOT</i>
        </div></template
      >
      <template #cell-role="{ value }"
        ><span class="user-pill" :class="`user-pill--${String(value).toLowerCase()}`">{{
          t(`admin.user.role.${value === 'ADMIN' ? 'ADMIN' : 'USER'}`)
        }}</span></template
      >
      <template #cell-status="{ value }"
        ><span class="user-status" :class="`user-status--${String(value).toLowerCase()}`"
          ><i />{{
            t(`admin.user.status.${String(value) as 'ACTIVE' | 'SUSPENDED' | 'BANNED'}`)
          }}</span
        ></template
      >
      <template #cell-createdAt="{ value }">{{ date(value) }}</template>
      <template #actions="{ row }"
        ><button
          class="row-action"
          :aria-label="t('admin.users.open', { name: String(row.displayName) })"
          @click.stop="openUser(row)"
        >
          ›
        </button></template
      >
    </AdminDataTable>
    <div class="table-pagination">
      <span
        >{{ t('admin.users.showing', { shown: users.users.length, total: users.total })
        }}<template v-if="users.total">{{
          t('admin.table.pageSuffix', { page: users.pageIndex + 1 })
        }}</template></span
      >
      <div>
        <button
          :disabled="users.pageIndex === 0 || users.loading"
          :aria-label="t('admin.table.prev')"
          @click="users.previousPage"
        >
          ←</button
        ><span class="page-number">{{ users.pageIndex + 1 }}</span
        ><button
          :disabled="users.nextCursor === null || users.loading"
          :aria-label="t('admin.table.next')"
          @click="users.nextPage"
        >
          →
        </button>
      </div>
    </div>
  </section>
</template>
