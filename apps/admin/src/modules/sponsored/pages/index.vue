<script setup lang="ts">
import { intlLocale, t } from '@retrobook/shared/i18n'
import { onMounted, reactive, ref } from 'vue'
import { adminSponsoredApi, type Sponsored } from '@/modules/sponsored/services/api'

const items = ref<Sponsored[]>([])
const form = reactive({ title: '', body: '', linkUrl: '', startsAt: '', endsAt: '' })
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const fail = (e: unknown, fallback: string) => {
  error.value = e instanceof Error ? e.message : fallback
}
const iso = (local: string) => (local ? new Date(local).toISOString() : null)
const when = (v: string | null) => (v ? new Date(v).toLocaleString(intlLocale()) : '—')
async function load() {
  try {
    items.value = (await adminSponsoredApi.list()).items
  } catch (e) {
    fail(e, t('admin.sponsored.loadError'))
  } finally {
    loading.value = false
  }
}
async function create() {
  if (busy.value) return
  busy.value = true
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
    notice.value = t('admin.sponsored.created')
    Object.assign(form, { title: '', body: '', linkUrl: '', startsAt: '', endsAt: '' })
    await load()
  } catch (e) {
    fail(e, t('admin.sponsored.createError'))
  } finally {
    busy.value = false
  }
}
async function toggle(s: Sponsored) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await adminSponsoredApi.update(s.id, { active: !s.active })
    await load()
  } catch (e) {
    fail(e, t('admin.sponsored.updateError'))
  } finally {
    busy.value = false
  }
}
async function remove(s: Sponsored) {
  if (busy.value || !window.confirm(t('admin.sponsored.confirmDelete', { title: s.title }))) return
  busy.value = true
  error.value = ''
  try {
    await adminSponsoredApi.remove(s.id)
    await load()
  } catch (e) {
    fail(e, t('admin.sponsored.deleteError'))
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.common.community') }}</p>
      <h1>{{ t('admin.nav.sponsored') }}</h1>
      <p class="page-description">{{ t('admin.sponsored.description') }}</p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="reports-detail" @submit.prevent="create">
      <label class="moderation-control"
        ><span>{{ t('admin.common.title') }}</span
        ><input v-model="form.title" maxlength="120" required
      /></label>
      <label class="moderation-control"
        ><span>{{ t('admin.common.body') }}</span
        ><textarea v-model="form.body" maxlength="500" rows="2" required />
      </label>
      <label class="moderation-control"
        ><span>{{ t('admin.sponsored.link') }}</span
        ><input
          v-model="form.linkUrl"
          maxlength="255"
          :placeholder="t('admin.sponsored.linkPlaceholder')"
          required
      /></label>
      <div class="words-form">
        <label class="moderation-control"
          ><span>{{ t('admin.sponsored.start') }}</span
          ><input v-model="form.startsAt" type="datetime-local" /></label
        ><label class="moderation-control"
          ><span>{{ t('admin.sponsored.end') }}</span
          ><input v-model="form.endsAt" type="datetime-local" /></label
        ><button class="button" type="submit" :disabled="busy">
          {{ t('admin.sponsored.create') }}
        </button>
      </div>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="loading" class="reports-empty" role="status">{{ t('admin.table.loading') }}</p>
    <p v-else-if="!items.length" class="reports-empty">{{ t('admin.sponsored.empty') }}</p>
    <ul class="announce-list">
      <li v-for="s in items" :key="s.id">
        <div>
          <strong>{{ s.title }}</strong>
          <small>{{ s.active ? t('admin.common.active') : t('admin.common.inactive') }}</small>
          <p class="report-meta">{{ s.body }}</p>
          <p class="report-meta">{{ s.linkUrl }} · {{ when(s.startsAt) }} → {{ when(s.endsAt) }}</p>
        </div>
        <div class="reports-actions">
          <button class="button button--quiet" :disabled="busy" @click="toggle(s)">
            {{ s.active ? t('admin.common.disable') : t('admin.common.enable') }}</button><button
            class="button button--danger"
            :disabled="busy"
            @click="remove(s)"
          >
            {{ t('admin.common.delete') }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
