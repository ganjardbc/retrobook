<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from '@/components/Button.vue'
import { useAuthStore } from '@/modules/auth/stores'
import { useProfileStore } from '@/modules/profile/stores'
import { ApiRequestError } from '@/plugins/http'
import {
  lifeEventsApi,
  type LifeEvent,
  type LifeEventKind,
} from '@/modules/profile/services/lifeEvents'

const profile = useProfileStore()
const auth = useAuthStore()
const items = ref<LifeEvent[]>([])
const title = ref('')
const kind = ref<LifeEventKind>('OTHER')
const happenedOn = ref('')
const privacy = ref<LifeEvent['privacy']>('FRIENDS')
const error = ref('')
const isMine = computed(() => auth.user?.id === profile.profile?.id)
const kindLabel: Record<LifeEventKind, string> = {
  MOVED: 'Pindah tempat tinggal',
  STARTED_JOB: 'Memulai pekerjaan',
  GRADUATED: 'Lulus',
  OTHER: 'Peristiwa lain',
}
async function load(username: string) {
  try {
    items.value = (await lifeEventsApi.forProfile(username)).items
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Life Event gagal dimuat.'
  }
}
watch(
  () => profile.profile?.username,
  (username) => {
    if (username) void load(username)
  },
  { immediate: true },
)
async function create() {
  error.value = ''
  try {
    const saved = await lifeEventsApi.create({
      title: title.value.trim(),
      kind: kind.value,
      happenedOn: happenedOn.value,
      privacy: privacy.value,
    })
    items.value.push(saved)
    items.value.sort((a, b) => b.happenedOn.localeCompare(a.happenedOn))
    title.value = ''
    happenedOn.value = ''
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Life Event gagal disimpan.'
  }
}
async function remove(item: LifeEvent) {
  try {
    await lifeEventsApi.remove(item.id)
    items.value = items.value.filter((event) => event.id !== item.id)
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Life Event gagal dihapus.'
  }
}
</script>

<template>
  <section class="life-events">
    <form v-if="isMine" class="life-events__form" @submit.prevent="create">
      <h2>Life Event</h2>
      <label
        >Peristiwa<select v-model="kind">
          <option value="MOVED">Pindah tempat tinggal</option>
          <option value="STARTED_JOB">Memulai pekerjaan</option>
          <option value="GRADUATED">Lulus</option>
          <option value="OTHER">Peristiwa lain</option>
        </select></label
      ><label>Judul<input v-model="title" maxlength="120" required /></label
      ><label>Tanggal kejadian<input v-model="happenedOn" type="date" required /></label
      ><label
        >Privasi<select v-model="privacy">
          <option value="PUBLIC">Publik</option>
          <option value="FRIENDS">Teman</option>
          <option value="ONLY_ME">Hanya saya</option>
        </select></label
      ><Button type="submit" :disabled="!title.trim() || !happenedOn">Tambahkan</Button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <article v-for="item in items" :key="item.id" class="life-events__item">
      <div>
        <strong>{{ profile.profile?.displayName }} {{ kindLabel[item.kind].toLowerCase() }}</strong>
        <p>{{ item.title }}</p>
        <time :datetime="item.happenedOn">{{
          new Date(`${item.happenedOn}T00:00:00`).toLocaleDateString()
        }}</time>
      </div>
      <Button v-if="isMine" variant="default" @click="remove(item)">Hapus</Button>
    </article>
  </section>
</template>

<style scoped>
.life-events {
  display: grid;
  gap: var(--sp-2);
}
.life-events__form,
.life-events__item {
  padding: var(--sp-3);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.life-events__form {
  display: grid;
  gap: var(--sp-2);
}
h2 {
  margin: 0;
}
label {
  display: grid;
  gap: 4px;
}
.life-events__item {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--sp-2);
}
.life-events__item p {
  margin: var(--sp-1) 0;
}
.life-events__item time {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
</style>
