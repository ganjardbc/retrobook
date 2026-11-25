<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { adminBotsApi, type Bot } from '@/modules/bots/services/api'

const bots = ref<Bot[]>([])
const form = reactive({ username: '', displayName: '', persona: '', postsPerDay: 2 })
const error = ref('')
const notice = ref('')
const fail = (e: unknown, fallback: string) => {
  error.value = e instanceof Error ? e.message : fallback
}
async function load() {
  try {
    bots.value = (await adminBotsApi.list()).items
  } catch (e) {
    fail(e, 'Gagal memuat bot.')
  }
}
async function create() {
  error.value = ''
  notice.value = ''
  try {
    await adminBotsApi.create({ ...form })
    notice.value = `Bot @${form.username} dibuat.`
    Object.assign(form, { username: '', displayName: '', persona: '', postsPerDay: 2 })
    await load()
  } catch (e) {
    fail(e, 'Gagal membuat bot.')
  }
}
async function update(bot: Bot, body: Parameters<typeof adminBotsApi.update>[1]) {
  error.value = ''
  notice.value = ''
  try {
    await adminBotsApi.update(bot.userId, body)
    await load()
  } catch (e) {
    fail(e, 'Gagal mengubah bot.')
  }
}
function editPersona(bot: Bot) {
  const persona = window.prompt('Topik persona (pisahkan dengan koma):', bot.persona)?.trim()
  if (persona) void update(bot, { persona })
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">KOMUNITAS</p>
      <h1>Bot AI</h1>
      <p class="page-description">
        Bot menerima pertemanan, memposting sesuai frekuensi, dan membalas komentar. Bot tidak bisa
        login dan tidak dihitung sebagai pengguna aktif.
      </p>
    </div>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="create">
      <label class="moderation-control"
        ><span>Username</span><input v-model="form.username" pattern="[A-Za-z0-9._]{3,30}" required
      /></label>
      <label class="moderation-control"
        ><span>Nama tampilan</span><input v-model="form.displayName" maxlength="80" required
      /></label>
      <label class="moderation-control"
        ><span>Topik persona</span
        ><input v-model="form.persona" maxlength="500" placeholder="coffee, music" required
      /></label>
      <label class="moderation-control"
        ><span>Post per hari</span
        ><input v-model.number="form.postsPerDay" type="number" min="1" max="24" required
      /></label>
      <button class="button" type="submit">Buat bot</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="!bots.length" class="reports-empty">Belum ada bot.</p>
    <ul class="announce-list">
      <li v-for="b in bots" :key="b.userId">
        <div>
          <strong>{{ b.user.displayName }}</strong>
          <small>@{{ b.user.username }} · {{ b.active ? 'Aktif' : 'Nonaktif' }}</small>
          <p class="report-meta">Topik: {{ b.persona }} · {{ b.postsPerDay }} post/hari</p>
        </div>
        <div class="reports-actions">
          <button class="button button--quiet" @click="update(b, { active: !b.active })">
            {{ b.active ? 'Nonaktifkan' : 'Aktifkan' }}</button
          ><button class="button button--quiet" @click="editPersona(b)">Ubah persona</button>
        </div>
      </li>
    </ul>
  </section>
</template>
