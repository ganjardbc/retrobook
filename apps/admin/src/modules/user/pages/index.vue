<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminDataTable, { type TableColumn } from '@/components/AdminDataTable.vue'
import AdminFilters from '@/components/AdminFilters.vue'
import { useUserStore } from '@/modules/user/stores'
import type { AdminUser } from '@/modules/user/services/types'

const users = useUserStore()
const router = useRouter()
const columns: TableColumn<Record<string, unknown>>[] = [
  { key: 'person', label: 'PENGGUNA' },
  { key: 'role', label: 'ROLE', width: '120px' },
  { key: 'status', label: 'STATUS', width: '140px' },
  { key: 'createdAt', label: 'BERGABUNG', width: '150px' },
]
let debounce: ReturnType<typeof setTimeout>
onMounted(() => void users.fetchUsers())
watch([() => users.search, () => users.filters.status, () => users.filters.role], () => {
  clearTimeout(debounce)
  users.resetPagination()
  debounce = setTimeout(() => void users.fetchUsers(), 250)
})
function openUser(row: Record<string, unknown>) { void router.push({ name: 'admin-users-detail', params: { id: String(row.id) } }) }
function date(value: unknown) { return new Date(String(value)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }
function user(row: Record<string, unknown>) { return row as unknown as AdminUser }
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">DIREKTORI KOMUNITAS</p><h1>Pengguna</h1><p class="page-description">Tinjau akun dan status keanggotaan komunitas.</p></div></div>
  <section class="surface-card users-card">
    <div class="card-toolbar"><div><h2>Semua pengguna</h2><p>Daftar akun Retrobook</p></div><span class="result-count">{{ users.total.toLocaleString('id-ID') }} pengguna</span></div>
    <AdminFilters v-model:search="users.search" v-model:filters="users.filters" search-placeholder="Cari nama, username, atau email…" :filter-definitions="[{ key: 'status', label: 'Status', options: [{ label: 'Aktif', value: 'ACTIVE' }, { label: 'Ditangguhkan', value: 'SUSPENDED' }, { label: 'Diblokir', value: 'BANNED' }] }, { key: 'role', label: 'Role', options: [{ label: 'Pengguna', value: 'USER' }, { label: 'Admin', value: 'ADMIN' }] }]" @reset="users.resetFilters" />
    <p v-if="users.error" class="user-error" role="alert">{{ users.error }} <button @click="users.fetchUsers">Coba lagi</button></p>
    <AdminDataTable :columns="columns" :rows="users.users as unknown as Record<string, unknown>[]" :loading="users.loading" empty-title="Belum ada pengguna untuk ditampilkan" empty-description="Ubah pencarian atau filter untuk melihat pengguna." @row-click="openUser">
      <template #cell-person="{ row }"><div class="user-person"><span class="user-avatar">{{ String(row.displayName || row.username).slice(0, 1).toUpperCase() }}</span><span><strong>{{ row.displayName }}</strong><small>@{{ row.username }} · {{ row.email }}</small></span><i v-if="user(row).isBot" class="bot-tag">BOT</i></div></template>
      <template #cell-role="{ value }"><span class="user-pill" :class="`user-pill--${String(value).toLowerCase()}`">{{ value === 'ADMIN' ? 'Admin' : 'Pengguna' }}</span></template>
      <template #cell-status="{ value }"><span class="user-status" :class="`user-status--${String(value).toLowerCase()}`"><i/>{{ value === 'ACTIVE' ? 'Aktif' : value === 'SUSPENDED' ? 'Ditangguhkan' : 'Diblokir' }}</span></template>
      <template #cell-createdAt="{ value }">{{ date(value) }}</template>
      <template #actions="{ row }"><button class="row-action" :aria-label="`Buka ${row.displayName}`" @click.stop="openUser(row)">›</button></template>
    </AdminDataTable>
    <div class="table-pagination"><span>Menampilkan <strong>{{ users.users.length }}</strong> dari <strong>{{ users.total }}</strong> pengguna <template v-if="users.total">· Halaman {{ users.pageIndex + 1 }}</template></span><div><button :disabled="users.pageIndex === 0 || users.loading" aria-label="Halaman sebelumnya" @click="users.previousPage">←</button><span class="page-number">{{ users.pageIndex + 1 }}</span><button :disabled="users.nextCursor === null || users.loading" aria-label="Halaman berikutnya" @click="users.nextPage">→</button></div></div>
  </section>
</template>
