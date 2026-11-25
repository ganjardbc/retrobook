<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/modules/auth/stores'
import { useProfileStore } from '@/modules/profile/stores'
import { ApiRequestError } from '@/plugins/http'
import Button from '@/components/Button.vue'
import { notesApi, type NoteItem } from '../services/notes'

const profile = useProfileStore()
const auth = useAuthStore()
const items = ref<NoteItem[]>([])
const title = ref('')
const body = ref('')
const privacy = ref<NoteItem['privacy']>('FRIENDS')
const editingId = ref<number | null>(null)
const error = ref('')
const isMine = computed(() => auth.user?.id === profile.profile?.id)
async function load(username: string) {
  try {
    items.value = (await notesApi.forProfile(username)).items
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Notes gagal dimuat.'
  }
}
watch(
  () => profile.profile?.username,
  (name) => {
    if (name) void load(name)
  },
  { immediate: true },
)
function edit(note: NoteItem) {
  editingId.value = note.id
  title.value = note.title
  body.value = note.body
  privacy.value = note.privacy
}
function reset() {
  editingId.value = null
  title.value = ''
  body.value = ''
  privacy.value = 'FRIENDS'
}
async function save() {
  error.value = ''
  try {
    const input = { title: title.value.trim(), body: body.value.trim(), privacy: privacy.value }
    const saved = editingId.value
      ? await notesApi.update(editingId.value, input)
      : await notesApi.create(input)
    if (editingId.value)
      items.value = items.value.map((note) => (note.id === saved.id ? saved : note))
    else items.value.unshift(saved)
    reset()
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Note gagal disimpan.'
  }
}
async function remove(note: NoteItem) {
  try {
    await notesApi.remove(note.id)
    items.value = items.value.filter((item) => item.id !== note.id)
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Note gagal dihapus.'
  }
}
</script>

<template>
  <section class="notes">
    <h2>Notes</h2>
    <p v-if="error" role="alert">{{ error }}</p>
    <form v-if="isMine" class="notes__form" @submit.prevent="save">
      <label>Judul<input v-model="title" maxlength="120" required /></label
      ><label>Isi note<textarea v-model="body" maxlength="20000" rows="7" required /></label
      ><label
        >Privasi<select v-model="privacy">
          <option value="PUBLIC">Publik</option>
          <option value="FRIENDS">Teman</option>
          <option value="ONLY_ME">Hanya saya</option>
        </select></label
      >
      <div>
        <Button type="submit" :disabled="!title.trim() || !body.trim()">{{
          editingId ? 'Simpan perubahan' : 'Tulis note'
        }}</Button
        ><Button v-if="editingId" variant="default" @click="reset">Batal</Button>
      </div>
    </form>
    <article v-for="note in items" :key="note.id" class="notes__item">
      <h3>{{ note.title }}</h3>
      <p class="notes__privacy">{{ note.privacy }}</p>
      <p class="notes__body">{{ note.body }}</p>
      <div v-if="isMine" class="notes__actions">
        <Button variant="default" @click="edit(note)">Edit</Button
        ><Button variant="default" @click="remove(note)">Hapus</Button>
      </div>
    </article>
    <p v-if="!items.length">Belum ada note.</p>
  </section>
</template>

<style scoped>
.notes {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
h2,
h3 {
  margin: 0;
}
.notes__form {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
}
label {
  display: grid;
  gap: 4px;
}
.notes__item {
  padding: var(--sp-3);
  border: 1px solid var(--c-border-soft);
}
.notes__privacy {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.notes__body {
  white-space: pre-wrap;
}
.notes__actions {
  display: flex;
  gap: var(--sp-2);
}
</style>
