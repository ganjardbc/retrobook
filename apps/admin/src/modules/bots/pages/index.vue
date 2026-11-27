<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, reactive, ref } from 'vue'
import { adminBotsApi, type Bot } from '@/modules/bots/services/api'

const bots = ref<Bot[]>([])
const form = reactive({ username: '', displayName: '', persona: '', postsPerDay: 2 })
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const fail = (e: unknown, fallback: string) => {
  error.value = e instanceof Error ? e.message : fallback
}
async function load() {
  try {
    bots.value = (await adminBotsApi.list()).items
  } catch (e) {
    fail(e, t('admin.bots.loadError'))
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
    await adminBotsApi.create({ ...form })
    notice.value = t('admin.bots.created', { username: form.username })
    Object.assign(form, { username: '', displayName: '', persona: '', postsPerDay: 2 })
    await load()
  } catch (e) {
    fail(e, t('admin.bots.createError'))
  } finally {
    busy.value = false
  }
}
async function update(bot: Bot, body: Parameters<typeof adminBotsApi.update>[1]) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await adminBotsApi.update(bot.userId, body)
    await load()
  } catch (e) {
    fail(e, t('admin.bots.updateError'))
  } finally {
    busy.value = false
  }
}
function editPersona(bot: Bot) {
  const persona = window.prompt(t('admin.bots.personaPrompt'), bot.persona)?.trim()
  if (persona) void update(bot, { persona })
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.common.community') }}</p>
      <h1>{{ t('admin.bots.title') }}</h1>
      <p class="page-description">{{ t('admin.bots.description') }}</p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="create">
      <label class="moderation-control"
        ><span>{{ t('auth.register.username') }}</span
        ><input v-model="form.username" pattern="[A-Za-z0-9._]{3,30}" required
      /></label>
      <label class="moderation-control"
        ><span>{{ t('auth.register.displayName') }}</span
        ><input v-model="form.displayName" maxlength="80" required
      /></label>
      <label class="moderation-control"
        ><span>{{ t('admin.bots.persona') }}</span
        ><input v-model="form.persona" maxlength="500" placeholder="coffee, music" required
      /></label>
      <label class="moderation-control"
        ><span>{{ t('admin.bots.postsPerDay') }}</span
        ><input v-model.number="form.postsPerDay" type="number" min="1" max="24" required
      /></label>
      <button class="button" type="submit" :disabled="busy">{{ t('admin.bots.create') }}</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="loading" class="reports-empty" role="status">{{ t('admin.table.loading') }}</p>
    <p v-else-if="!bots.length" class="reports-empty">{{ t('admin.bots.empty') }}</p>
    <ul class="announce-list">
      <li v-for="b in bots" :key="b.userId">
        <div>
          <strong>{{ b.user.displayName }}</strong>
          <small
            >@{{ b.user.username }} ·
            {{ b.active ? t('admin.common.active') : t('admin.common.inactive') }}</small
          >
          <p class="report-meta">
            {{ t('admin.bots.summary', { persona: b.persona, count: b.postsPerDay }) }}
          </p>
        </div>
        <div class="reports-actions">
          <button
            class="button button--quiet"
            :disabled="busy"
            @click="update(b, { active: !b.active })"
          >
            {{ b.active ? t('admin.common.disable') : t('admin.common.enable') }}</button><button
            class="button button--quiet"
            :disabled="busy"
            @click="editPersona(b)"
          >
            {{ t('admin.bots.editPersona') }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
