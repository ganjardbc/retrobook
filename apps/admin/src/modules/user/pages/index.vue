<script setup lang="ts">
import AdminDataTable, { type TableColumn } from '@/components/AdminDataTable.vue'
import AdminFilters from '@/components/AdminFilters.vue'
import { useUserStore } from '@/modules/user/stores'

const users = useUserStore()
const columns: TableColumn<Record<string, unknown>>[] = [
  { key: 'person', label: 'PENGGUNA' },
  { key: 'role', label: 'ROLE', width: '140px' },
  { key: 'status', label: 'STATUS', width: '140px' },
  { key: 'joined', label: 'BERGABUNG', width: '150px' },
]
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">DIREKTORI KOMUNITAS</p><h1>Pengguna</h1><p class="page-description">Tinjau akun dan status keanggotaan komunitas.</p></div><button class="button button--quiet" disabled title="Akan tersedia bersama fitur manajemen pengguna">＋ Tambah pengguna</button></div>
  <section class="surface-card users-card">
    <div class="card-toolbar"><div><h2>Semua pengguna</h2><p>Daftar akun Retrobook</p></div><span class="result-count">{{ users.filteredUsers.length }} pengguna</span></div>
    <AdminFilters v-model:search="users.search" v-model:filters="users.filters" search-placeholder="Cari nama, username, atau email…" :filter-definitions="[{ key: 'status', label: 'Status', options: [{ label: 'Aktif', value: 'ACTIVE' }, { label: 'Ditangguhkan', value: 'SUSPENDED' }, { label: 'Diblokir', value: 'BANNED' }] }, { key: 'role', label: 'Role', options: [{ label: 'Pengguna', value: 'USER' }, { label: 'Admin', value: 'ADMIN' }] }]"/>
    <AdminDataTable :columns="columns" :rows="users.filteredUsers" :loading="users.loading" empty-title="Belum ada pengguna untuk ditampilkan" empty-description="Daftar pengguna akan muncul saat API admin tersedia."/>
    <div class="table-pagination"><span>Menampilkan <strong>0</strong> dari <strong>0</strong> pengguna</span><div><button disabled aria-label="Halaman sebelumnya">←</button><span class="page-number">1</span><button disabled aria-label="Halaman berikutnya">→</button></div></div>
  </section>
</template>
