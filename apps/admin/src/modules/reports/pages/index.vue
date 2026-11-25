<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useReportsStore } from '@/modules/reports/stores'
import type { AdminReport, ReportAction, ReportStatus } from '@/modules/reports/services/types'

const reports = useReportsStore()
const note = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)
const isUser = (r: AdminReport) => r.targetType === 'USER'
onMounted(() => void reports.fetch())
watch(
  () => reports.status,
  () => {
    reports.selectedId = null
    void reports.fetch()
  },
)
watch(
  () => reports.selectedId,
  () => {
    note.value = ''
    error.value = ''
  },
)
function date(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function preview(r: AdminReport) {
  if (!r.target) return 'Target sudah tidak ada.'
  return 'content' in r.target ? r.target.content || '〔gambar〕' : `Profil @${r.target.username}`
}
function authorOf(r: AdminReport) {
  return r.target ? ('author' in r.target ? r.target.author : r.target) : null
}
async function decide(status: 'REVIEWED' | 'DISMISSED', action?: ReportAction) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await reports.decide(status, action, note.value.trim())
    notice.value = 'Keputusan tersimpan dan tercatat di audit.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Keputusan gagal disimpan.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KEAMANAN KOMUNITAS</p>
      <h1>Antrean laporan</h1>
      <p class="page-description">
        Putuskan laporan di tempat: pilih, tulis catatan bila perlu, klik keputusan.
      </p>
    </div>
    <span class="moderation-total">{{ reports.total.toLocaleString('id-ID') }} laporan</span>
  </div>
  <section class="surface-card reports-card">
    <div class="reports-list">
      <label class="moderation-control"
        ><span>Status</span
        ><select v-model="reports.status">
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Ditinjau</option>
          <option value="DISMISSED">Diabaikan</option>
          <option value="">Semua</option>
        </select></label
      >
      <p v-if="reports.error" class="user-error" role="alert">
        {{ reports.error }} <button @click="reports.fetch()">Coba lagi</button>
      </p>
      <p v-else-if="!reports.items.length && !reports.loading" class="reports-empty">
        Tidak ada laporan.
      </p>
      <button
        v-for="r in reports.items"
        :key="r.id"
        class="reports-item"
        :class="{ 'reports-item--active': r.id === reports.selectedId }"
        @click="reports.selectedId = r.id"
      >
        <strong>{{ r.reason }} · {{ r.targetType }}</strong
        ><span>{{ preview(r).slice(0, 80) }}</span
        ><small>{{ date(r.createdAt) }} · {{ r.status }}</small>
      </button>
      <button
        v-if="reports.nextCursor"
        class="button button--quiet"
        :disabled="reports.loading"
        @click="reports.fetch(true)"
      >
        Muat lagi
      </button>
    </div>
    <div class="reports-detail">
      <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
      <p v-if="!reports.selected" class="reports-empty">Pilih laporan di kiri.</p>
      <template v-else>
        <h2>
          {{ reports.selected.reason }} · {{ reports.selected.targetType }} #{{
            reports.selected.targetId
          }}
        </h2>
        <p class="report-meta">
          Dilaporkan oleh <strong>@{{ reports.selected.reporter.username }}</strong
          >, {{ date(reports.selected.createdAt) }}
        </p>
        <blockquote class="report-target">{{ preview(reports.selected) }}</blockquote>
        <p v-if="authorOf(reports.selected)" class="report-meta">
          Penulis: <strong>@{{ authorOf(reports.selected)?.username }}</strong>
        </p>
        <p v-if="reports.selected.note" class="report-meta">
          Catatan pelapor: {{ reports.selected.note }}
        </p>
        <template v-if="reports.selected.status === 'PENDING'">
          <label class="moderation-control"
            ><span>Catatan keputusan (opsional)</span><input v-model="note" maxlength="500"
          /></label>
          <p v-if="error" class="user-error" role="alert">{{ error }}</p>
          <div class="reports-actions">
            <button class="button button--quiet" :disabled="busy" @click="decide('DISMISSED')">
              Abaikan
            </button>
            <button
              class="button button--quiet"
              :disabled="busy || isUser(reports.selected)"
              @click="decide('REVIEWED', 'HIDE_CONTENT')"
            >
              Sembunyikan
            </button>
            <button
              class="button button--danger"
              :disabled="busy || isUser(reports.selected)"
              @click="decide('REVIEWED', 'DELETE_CONTENT')"
            >
              Hapus
            </button>
            <button
              class="button button--danger"
              :disabled="busy"
              @click="decide('REVIEWED', 'SUSPEND_USER')"
            >
              Skors penulis
            </button>
          </div>
        </template>
        <p v-else class="report-meta">
          Sudah diputuskan: {{ reports.selected.status as ReportStatus }}.
        </p>
      </template>
    </div>
  </section>
</template>
