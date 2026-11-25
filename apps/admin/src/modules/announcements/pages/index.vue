<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminAnnouncementsApi, type Announcement } from '@/modules/announcements/services/api'

const items = ref<Announcement[]>([])
const title = ref('')
const body = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)
const fail = (e: unknown, fallback: string) => {
  error.value = e instanceof Error ? e.message : fallback
}
async function load() {
  try {
    items.value = (await adminAnnouncementsApi.list()).items
  } catch (e) {
    fail(e, 'Gagal memuat pengumuman.')
  }
}
async function create() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const row = await adminAnnouncementsApi.create(title.value, body.value)
    notice.value = `Pengumuman terbit; ${row.notified} pengguna diberi notifikasi.`
    title.value = ''
    body.value = ''
    await load()
  } catch (e) {
    fail(e, 'Gagal membuat pengumuman.')
  } finally {
    busy.value = false
  }
}
async function toggle(a: Announcement) {
  error.value = ''
  notice.value = ''
  try {
    await adminAnnouncementsApi.setActive(a.id, !a.active)
    await load()
  } catch (e) {
    fail(e, 'Gagal mengubah pengumuman.')
  }
}
async function remove(a: Announcement) {
  if (!window.confirm(`Hapus pengumuman "${a.title}" beserta notifikasinya?`)) return
  error.value = ''
  notice.value = ''
  try {
    await adminAnnouncementsApi.remove(a.id)
    await load()
  } catch (e) {
    fail(e, 'Gagal menghapus pengumuman.')
  }
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KOMUNIKASI</p>
      <h1>Pengumuman</h1>
      <p class="page-description">
        Pengumuman baru tampil sebagai banner di feed dan notifikasi untuk semua pengguna aktif.
      </p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="reports-detail" @submit.prevent="create">
      <label class="moderation-control"
        ><span>Judul</span><input v-model="title" maxlength="120" required
      /></label>
      <label class="moderation-control"
        ><span>Isi</span><textarea v-model="body" maxlength="2000" rows="3" required />
      </label>
      <div><button class="button" type="submit" :disabled="busy">Terbitkan</button></div>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="!items.length" class="reports-empty">Belum ada pengumuman.</p>
    <ul class="announce-list">
      <li v-for="a in items" :key="a.id">
        <div>
          <strong>{{ a.title }}</strong> <small>{{ a.active ? 'Aktif' : 'Nonaktif' }}</small>
          <p class="report-meta">{{ a.body }}</p>
        </div>
        <div class="reports-actions">
          <button class="button button--quiet" @click="toggle(a)">
            {{ a.active ? 'Nonaktifkan' : 'Aktifkan' }}</button><button
            class="button button--danger"
            @click="remove(a)"
          >
            Hapus
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
