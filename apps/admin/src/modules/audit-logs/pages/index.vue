<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  adminAuditLogsApi,
  type AuditFilters,
  type AuditLog,
} from '@/modules/audit-logs/services/api'

const filters = reactive<AuditFilters>({ adminId: '', action: '', from: '', to: '' })
const items = ref<AuditLog[]>([])
const total = ref(0)
const nextCursor = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
async function load(more = false) {
  loading.value = true
  error.value = ''
  try {
    const page = await adminAuditLogsApi.list(filters, more ? nextCursor.value : null)
    items.value = more ? [...items.value, ...page.items] : page.items
    total.value = page.total
    nextCursor.value = page.nextCursor
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat audit log.'
  } finally {
    loading.value = false
  }
}
const when = (v: string) => new Date(v).toLocaleString('id-ID')
onMounted(() => void load())
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KEAMANAN</p>
      <h1>Audit log</h1>
      <p class="page-description">
        Jejak semua aksi tulis admin. Hanya baca; tidak bisa diubah atau dihapus.
      </p>
    </div>
    <span class="moderation-total">{{ total.toLocaleString('id-ID') }} entri</span>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="load()">
      <label class="moderation-control"
        ><span>ID admin</span><input v-model="filters.adminId" type="number" min="1"
      /></label>
      <label class="moderation-control"
        ><span>Aksi</span
        ><input v-model="filters.action" maxlength="60" placeholder="mis. USER_STATUS"
      /></label>
      <label class="moderation-control"
        ><span>Dari</span><input v-model="filters.from" type="date"
      /></label>
      <label class="moderation-control"
        ><span>Sampai</span><input v-model="filters.to" type="date"
      /></label>
      <button class="button" type="submit">Terapkan</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="!items.length && !loading" class="reports-empty">Tidak ada entri.</p>
    <div v-else class="audit-table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Admin</th>
            <th>Aksi</th>
            <th>Target</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in items" :key="l.id">
            <td>{{ when(l.createdAt) }}</td>
            <td>@{{ l.admin.username }}</td>
            <td>{{ l.action }}</td>
            <td>
              {{ l.targetType ?? '—' }}<template v-if="l.targetId"> #{{ l.targetId }}</template>
            </td>
            <td>
              <code>{{ l.detail ? JSON.stringify(l.detail) : '' }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button v-if="nextCursor" class="button button--quiet" :disabled="loading" @click="load(true)">
      Muat lagi
    </button>
  </section>
</template>
