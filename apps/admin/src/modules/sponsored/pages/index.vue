<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { adminSponsoredApi, type Sponsored } from '@/modules/sponsored/services/api'

const items = ref<Sponsored[]>([])
const form = reactive({ title: '', body: '', linkUrl: '', startsAt: '', endsAt: '' })
const error = ref('')
const notice = ref('')
const fail = (e: unknown, fallback: string) => {
  error.value = e instanceof Error ? e.message : fallback
}
const iso = (local: string) => (local ? new Date(local).toISOString() : null)
const when = (v: string | null) => (v ? new Date(v).toLocaleString('id-ID') : '—')
async function load() {
  try {
    items.value = (await adminSponsoredApi.list()).items
  } catch (e) {
    fail(e, 'Gagal memuat promosi.')
  }
}
async function create() {
  error.value = ''
  notice.value = ''
  try {
    await adminSponsoredApi.create({
      title: form.title,
      body: form.body,
      linkUrl: form.linkUrl,
      startsAt: iso(form.startsAt),
      endsAt: iso(form.endsAt),
    })
    notice.value = 'Promosi dibuat.'
    Object.assign(form, { title: '', body: '', linkUrl: '', startsAt: '', endsAt: '' })
    await load()
  } catch (e) {
    fail(e, 'Gagal membuat promosi.')
  }
}
async function toggle(s: Sponsored) {
  error.value = ''
  try {
    await adminSponsoredApi.update(s.id, { active: !s.active })
    await load()
  } catch (e) {
    fail(e, 'Gagal mengubah promosi.')
  }
}
async function remove(s: Sponsored) {
  if (!window.confirm(`Hapus promosi "${s.title}"?`)) return
  error.value = ''
  try {
    await adminSponsoredApi.remove(s.id)
    await load()
  } catch (e) {
    fail(e, 'Gagal menghapus promosi.')
  }
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KOMUNITAS</p>
      <h1>Sponsored</h1>
      <p class="page-description">
        Promosi internal di kolom kanan user app. Hanya satu yang tampil: yang aktif, dalam jadwal,
        dan terbaru. Tautan harus http(s) atau path internal.
      </p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="reports-detail" @submit.prevent="create">
      <label class="moderation-control"
        ><span>Judul</span><input v-model="form.title" maxlength="120" required
      /></label>
      <label class="moderation-control"
        ><span>Isi</span><textarea v-model="form.body" maxlength="500" rows="2" required />
      </label>
      <label class="moderation-control"
        ><span>Tautan</span
        ><input
          v-model="form.linkUrl"
          maxlength="255"
          placeholder="https://… atau /hashtag/promo"
          required
      /></label>
      <div class="words-form">
        <label class="moderation-control"
          ><span>Mulai (opsional)</span
          ><input v-model="form.startsAt" type="datetime-local" /></label
        ><label class="moderation-control"
          ><span>Selesai (opsional)</span
          ><input v-model="form.endsAt" type="datetime-local" /></label
        ><button class="button" type="submit">Buat promosi</button>
      </div>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="!items.length" class="reports-empty">Belum ada promosi.</p>
    <ul class="announce-list">
      <li v-for="s in items" :key="s.id">
        <div>
          <strong>{{ s.title }}</strong> <small>{{ s.active ? 'Aktif' : 'Nonaktif' }}</small>
          <p class="report-meta">{{ s.body }}</p>
          <p class="report-meta">{{ s.linkUrl }} · {{ when(s.startsAt) }} → {{ when(s.endsAt) }}</p>
        </div>
        <div class="reports-actions">
          <button class="button button--quiet" @click="toggle(s)">
            {{ s.active ? 'Nonaktifkan' : 'Aktifkan' }}</button><button
            class="button button--danger"
            @click="remove(s)"
          >
            Hapus
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
