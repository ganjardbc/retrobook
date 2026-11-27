<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { adminTrendingApi, type AdminHashtag } from '@/modules/trending/services/api'

const items = ref<AdminHashtag[]>([])
const nextCursor = ref<string | null>(null)
const q = ref('')
const error = ref('')
const loading = ref(false)
// Hanya respons permintaan terbaru yang dipakai: respons pencarian lama yang datang terlambat tidak boleh
// menimpa daftar (dan membatalkan tampilan status "disembunyikan" yang baru diubah).
let latest = 0
async function load(more = false) {
  const mine = ++latest
  loading.value = true
  error.value = ''
  try {
    const page = await adminTrendingApi.list(q.value, more ? nextCursor.value : null)
    if (mine !== latest) return
    items.value = more ? [...items.value, ...page.items] : page.items
    nextCursor.value = page.nextCursor
  } catch (e) {
    if (mine === latest)
      error.value = e instanceof Error ? e.message : t('admin.trending.loadError')
  } finally {
    if (mine === latest) loading.value = false
  }
}
async function toggle(h: AdminHashtag) {
  error.value = ''
  try {
    await adminTrendingApi.setHidden(h.id, !h.hidden)
    h.hidden = !h.hidden
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.trending.updateError')
  }
}
onMounted(() => void load())
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.common.community') }}</p>
      <h1>{{ t('admin.trending.title') }}</h1>
      <p class="page-description">{{ t('admin.trending.description') }}</p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="load()">
      <label class="moderation-control"
        ><span>{{ t('admin.trending.search') }}</span
        ><input v-model="q" maxlength="50" /></label
      ><button class="button" type="submit">{{ t('search.button') }}</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="!items.length && !loading" class="reports-empty">{{ t('admin.trending.empty') }}</p>
    <ul class="announce-list">
      <li v-for="h in items" :key="h.id">
        <div>
          <strong>#{{ h.tag }}</strong>
          <small
            >{{ t('admin.trending.uses', { count: h.uses }) }} ·
            {{ h.hidden ? t('admin.trending.hidden') : t('admin.moderation.state.visible') }}</small
          >
        </div>
        <div class="reports-actions">
          <button
            class="button"
            :class="h.hidden ? 'button--quiet' : 'button--danger'"
            @click="toggle(h)"
          >
            {{ h.hidden ? t('admin.common.show') : t('admin.common.hide') }}
          </button>
        </div>
      </li>
    </ul>
    <button v-if="nextCursor" class="button button--quiet" :disabled="loading" @click="load(true)">
      {{ t('admin.common.loadMore') }}
    </button>
  </section>
</template>
