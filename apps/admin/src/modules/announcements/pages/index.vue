<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
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
    fail(e, t('admin.announcements.loadError'))
  }
}
async function create() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const row = await adminAnnouncementsApi.create(title.value, body.value)
    notice.value = t('admin.announcements.published', { count: row.notified })
    title.value = ''
    body.value = ''
    await load()
  } catch (e) {
    fail(e, t('admin.announcements.createError'))
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
    fail(e, t('admin.announcements.updateError'))
  }
}
async function remove(a: Announcement) {
  if (!window.confirm(t('admin.announcements.confirmDelete', { title: a.title }))) return
  error.value = ''
  notice.value = ''
  try {
    await adminAnnouncementsApi.remove(a.id)
    await load()
  } catch (e) {
    fail(e, t('admin.announcements.deleteError'))
  }
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.announcements.eyebrow') }}</p>
      <h1>{{ t('admin.nav.announcements') }}</h1>
      <p class="page-description">{{ t('admin.announcements.description') }}</p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="reports-detail" @submit.prevent="create">
      <label class="moderation-control"
        ><span>{{ t('admin.common.title') }}</span
        ><input v-model="title" maxlength="120" required
      /></label>
      <label class="moderation-control"
        ><span>{{ t('admin.common.body') }}</span
        ><textarea v-model="body" maxlength="2000" rows="3" required />
      </label>
      <div>
        <button class="button" type="submit" :disabled="busy">
          {{ t('admin.announcements.publish') }}
        </button>
      </div>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="!items.length" class="reports-empty">{{ t('admin.announcements.empty') }}</p>
    <ul class="announce-list">
      <li v-for="a in items" :key="a.id">
        <div>
          <strong>{{ a.title }}</strong>
          <small>{{ a.active ? t('admin.common.active') : t('admin.common.inactive') }}</small>
          <p class="report-meta">{{ a.body }}</p>
        </div>
        <div class="reports-actions">
          <button class="button button--quiet" @click="toggle(a)">
            {{ a.active ? t('admin.common.disable') : t('admin.common.enable') }}</button><button
            class="button button--danger"
            @click="remove(a)"
          >
            {{ t('admin.common.delete') }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
