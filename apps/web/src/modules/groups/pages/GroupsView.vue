<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@/components/Button.vue'
import { ApiRequestError } from '@/plugins/http'
import { groupsApi } from '../services/api'
import type { GroupPrivacy, GroupSummary } from '@retrobook/shared'

const groups = ref<GroupSummary[]>([])
const suggested = ref<GroupSummary[]>([])
const name = ref('')
const description = ref('')
const privacy = ref<GroupPrivacy>('PUBLIC')
const error = ref('')
const saving = ref(false)
async function load() {
  try {
    const data = await groupsApi.list()
    groups.value = data.items
    suggested.value = data.suggested
  } catch (cause) {
    error.value = cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Grup gagal dimuat.'
  }
}
async function create() {
  error.value = ''
  if (!name.value.trim()) return
  saving.value = true
  try {
    groups.value.unshift(
      await groupsApi.create({
        name: name.value.trim(),
        description: description.value.trim(),
        privacy: privacy.value,
      }),
    )
    name.value = ''
    description.value = ''
  } catch (cause) {
    error.value = cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Grup gagal dibuat.'
  } finally {
    saving.value = false
  }
}
async function join(group: GroupSummary) {
  try {
    groups.value.unshift(await groupsApi.join(group.id))
    suggested.value = suggested.value.filter((item) => item.id !== group.id)
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Tidak bisa bergabung ke grup.'
  }
}
onMounted(() => void load())
</script>

<template>
  <main class="groups">
    <h1>Grup</h1>
    <form class="groups__create" @submit.prevent="create">
      <label>Nama grup <input v-model="name" maxlength="80" required /></label>
      <label>Deskripsi <textarea v-model="description" maxlength="2000" rows="2" /></label>
      <label
        >Privasi
        <select v-model="privacy">
          <option value="PUBLIC">Publik</option>
          <option value="CLOSED">Tertutup</option>
        </select></label
      >
      <Button type="submit" :disabled="saving || !name.trim()">Buat grup</Button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <section>
      <h2>Grup saya</h2>
      <p v-if="!groups.length">Kamu belum bergabung ke grup.</p>
      <ul>
        <li v-for="group in groups" :key="group.id">
          <RouterLink :to="`/groups/${group.id}`"
            ><strong>{{ group.name }}</strong
            ><span
              >{{ group.memberCount }} anggota ·
              {{ group.privacy === 'PUBLIC' ? 'Publik' : 'Tertutup' }}</span
            ><small>{{ group.description }}</small></RouterLink
          >
        </li>
      </ul>
    </section>
    <section v-if="suggested.length">
      <h2>Suggested groups</h2>
      <ul>
        <li v-for="group in suggested" :key="group.id">
          <RouterLink :to="`/groups/${group.id}`"
            ><strong>{{ group.name }}</strong
            ><span>{{ group.memberCount }} anggota</span
            ><small>{{ group.description }}</small></RouterLink
          ><Button variant="default" @click="join(group)">Join</Button>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.groups {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
h1,
h2 {
  margin: 0;
}
.groups__create {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
}
label {
  display: grid;
  gap: 4px;
}
ul {
  display: grid;
  gap: var(--sp-2);
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
  align-items: center;
  padding: var(--sp-2);
  border: 1px solid var(--c-border-soft);
}
li a {
  display: grid;
  gap: 3px;
  color: var(--c-text);
  text-decoration: none;
}
li span,
li small {
  color: var(--c-text-muted);
}
</style>
