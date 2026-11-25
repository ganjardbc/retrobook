<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminTrendingApi, type AdminHashtag } from '@/modules/trending/services/api'

const items = ref<AdminHashtag[]>([])
const nextCursor = ref<string | null>(null)
const q = ref('')
const error = ref('')
const loading = ref(false)
async function load(more = false) {
  loading.value = true
  error.value = ''
  try {
    const page = await adminTrendingApi.list(q.value, more ? nextCursor.value : null)
    items.value = more ? [...items.value, ...page.items] : page.items
    nextCursor.value = page.nextCursor
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat hashtag.'
  } finally {
    loading.value = false
  }
}
async function toggle(h: AdminHashtag) {
  error.value = ''
  try {
    await adminTrendingApi.setHidden(h.id, !h.hidden)
    h.hidden = !h.hidden
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal mengubah hashtag.'
  }
}
onMounted(() => void load())
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KOMUNITAS</p>
      <h1>Kelola trending</h1>
      <p class="page-description">
        Hashtag yang disembunyikan tidak muncul di daftar trending; halaman hashtag dan postnya
        tetap ada.
      </p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="load()">
      <label class="moderation-control"
        ><span>Cari hashtag</span><input v-model="q" maxlength="50" /></label
      ><button class="button" type="submit">Cari</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="!items.length && !loading" class="reports-empty">Tidak ada hashtag.</p>
    <ul class="announce-list">
      <li v-for="h in items" :key="h.id">
        <div>
          <strong>#{{ h.tag }}</strong>
          <small
            >{{ h.uses }} post · {{ h.hidden ? 'Disembunyikan dari trending' : 'Tampil' }}</small
          >
        </div>
        <div class="reports-actions">
          <button
            class="button"
            :class="h.hidden ? 'button--quiet' : 'button--danger'"
            @click="toggle(h)"
          >
            {{ h.hidden ? 'Tampilkan' : 'Sembunyikan' }}
          </button>
        </div>
      </li>
    </ul>
    <button v-if="nextCursor" class="button button--quiet" :disabled="loading" @click="load(true)">
      Muat lagi
    </button>
  </section>
</template>
