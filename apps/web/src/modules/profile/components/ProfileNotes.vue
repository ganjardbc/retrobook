<script setup lang="ts">
import { PRIVACIES } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import FormRow from '@/components/FormRow.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import PageCard from '@/components/PageCard.vue'
import { PRIVACY_ICONS } from '@/helpers/privacy'
import { useAuthStore } from '@/modules/auth/stores'
import { useProfileStore } from '@/modules/profile/stores'
import { ApiRequestError } from '@/plugins/http'
import { notesApi, type NoteItem } from '../services/notes'

const privacyOptions = computed<IconOption[]>(() =>
  PRIVACIES.map((p) => ({ value: p, label: t(`privacy.${p}`), icon: PRIVACY_ICONS[p] })),
)
const profile = useProfileStore()
const auth = useAuthStore()
const items = ref<NoteItem[]>([])
const showForm = ref(false)
const title = ref('')
const body = ref('')
const privacy = ref<NoteItem['privacy']>('FRIENDS')
const editingId = ref<number | null>(null)
const error = ref('')
const expanded = ref(new Set<number>())
const LONG_NOTE = 200
function toggle(id: number) {
  const next = new Set(expanded.value)
  if (!next.delete(id)) next.add(id)
  expanded.value = next
}
const isMine = computed(() => auth.user?.id === profile.profile?.id)

const message = (cause: unknown, fallback: string) =>
  cause instanceof ApiRequestError ? cause.messages.join(' ') : fallback

async function load(username: string) {
  try {
    items.value = (await notesApi.forProfile(username)).items
  } catch (cause) {
    error.value = message(cause, t('notes.loadError'))
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
  showForm.value = true
}
function reset() {
  showForm.value = false
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
    error.value = message(cause, t('notes.saveError'))
  }
}
async function remove(note: NoteItem) {
  try {
    await notesApi.remove(note.id)
    items.value = items.value.filter((item) => item.id !== note.id)
  } catch (cause) {
    error.value = message(cause, t('notes.deleteError'))
  }
}
</script>

<template>
  <PageCard :title="t('notes.title')" heading="h2">
    <template v-if="isMine" #actions>
      <Button v-if="!showForm" @click="showForm = true">{{ t('notes.write') }}</Button>
    </template>
    <form v-if="showForm" class="form" @submit.prevent="save">
      <FormRow stacked :label="t('notes.name')" for-id="note-title">
        <input id="note-title" v-model="title" maxlength="120" required />
      </FormRow>
      <FormRow stacked :label="t('notes.body')" for-id="note-body">
        <textarea id="note-body" v-model="body" maxlength="20000" rows="5" required />
      </FormRow>
      <FormRow stacked :label="t('notes.privacy')">
        <IconSelect v-model="privacy" :options="privacyOptions" :label="t('notes.privacy')" />
      </FormRow>
      <div class="form__actions">
        <Button type="submit" :disabled="!title.trim() || !body.trim()">{{
          editingId ? t('notes.save') : t('notes.publish')
        }}</Button>
        <Button variant="default" @click="reset">{{ t('page.cancel') }}</Button>
      </div>
    </form>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <ul v-if="items.length" class="list">
      <li v-for="note in items" :key="note.id" class="item">
        <div class="item__head">
          <strong class="item__title">{{ note.title }}</strong>
          <span class="item__meta">
            <Icon
              :icon="PRIVACY_ICONS[note.privacy]"
              role="img"
              :aria-label="t(`privacy.${note.privacy}`)"
            />
            <time :datetime="note.createdAt">{{
              new Date(note.createdAt).toLocaleDateString([], { dateStyle: 'medium' })
            }}</time>
          </span>
        </div>
        <p
          class="item__body"
          :class="{ 'item__body--clamp': note.body.length > LONG_NOTE && !expanded.has(note.id) }"
        >
          {{ note.body }}
        </p>
        <button
          v-if="note.body.length > LONG_NOTE"
          type="button"
          class="item__more"
          @click="toggle(note.id)"
        >
          {{ expanded.has(note.id) ? t('notes.less') : t('notes.more') }}
        </button>
        <div v-if="isMine" class="item__actions">
          <Button variant="default" @click="edit(note)">{{ t('notes.edit') }}</Button>
          <Button variant="default" @click="remove(note)">{{ t('notes.delete') }}</Button>
        </div>
      </li>
    </ul>
    <EmptyState
      v-else-if="!showForm"
      icon="mdi:note-text-outline"
      :title="t('notes.empty')"
      :hint="isMine ? t('notes.emptyHint') : undefined"
    />
  </PageCard>
</template>

<style scoped>
.form {
  display: grid;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border-soft);
}
.form__actions {
  display: flex;
  gap: var(--sp-2);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  padding: var(--sp-3) 0;
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item:first-child {
  padding-top: 0;
}
.item__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}
.item__title {
  overflow-wrap: anywhere;
}
.item__meta {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--sp-1);
  color: var(--c-text-muted);
}
.item__body {
  margin: var(--sp-1) 0 var(--sp-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.item__body--clamp {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.item__more {
  margin: 0 0 var(--sp-2);
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.item__more:hover {
  text-decoration: underline;
}
.item__actions {
  display: flex;
  gap: var(--sp-2);
}
</style>
