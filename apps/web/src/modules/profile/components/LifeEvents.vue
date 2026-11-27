<script setup lang="ts">
import { PRIVACIES } from '@retrobook/shared'
import { t, intlLocale } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import Button from '@/components/Button.vue'
import FormRow from '@/components/FormRow.vue'
import IconSelect, { type IconOption } from '@/components/IconSelect.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { PRIVACY_ICONS } from '@/helpers/privacy'
import { useAuthStore } from '@/modules/auth/stores'
import { useProfileStore } from '@/modules/profile/stores'
import { ApiRequestError } from '@/plugins/http'
import {
  lifeEventsApi,
  type LifeEvent,
  type LifeEventKind,
} from '@/modules/profile/services/lifeEvents'

const KINDS: LifeEventKind[] = ['MOVED', 'STARTED_JOB', 'GRADUATED', 'OTHER']
const KIND_ICONS: Record<LifeEventKind, string> = {
  MOVED: 'mdi:home-city-outline',
  STARTED_JOB: 'mdi:briefcase-outline',
  GRADUATED: 'mdi:school-outline',
  OTHER: 'mdi:star-outline',
}
const kindOptions = computed<IconOption[]>(() =>
  KINDS.map((k) => ({ value: k, label: t(`lifeEvents.kind.${k}`), icon: KIND_ICONS[k] })),
)
const privacyOptions = computed<IconOption[]>(() =>
  PRIVACIES.map((p) => ({ value: p, label: t(`privacy.${p}`), icon: PRIVACY_ICONS[p] })),
)

const profile = useProfileStore()
const auth = useAuthStore()
const items = ref<LifeEvent[]>([])
const showForm = ref(false)
const title = ref('')
const kind = ref<LifeEventKind>('OTHER')
const happenedOn = ref('')
const privacy = ref<LifeEvent['privacy']>('FRIENDS')
const error = ref('')
const loading = ref(true)
const busy = ref(false)
const isMine = computed(() => auth.user?.id === profile.profile?.id)

const message = (cause: unknown, fallback: string) =>
  cause instanceof ApiRequestError ? cause.messages.join(' ') : fallback

async function load(username: string) {
  loading.value = true
  try {
    items.value = (await lifeEventsApi.forProfile(username)).items
  } catch (cause) {
    error.value = message(cause, t('lifeEvents.loadError'))
  } finally {
    loading.value = false
  }
}
watch(
  () => profile.profile?.username,
  (username) => {
    if (username) void load(username)
  },
  { immediate: true },
)
function closeForm() {
  showForm.value = false
  title.value = happenedOn.value = ''
}
async function create() {
  if (busy.value) return
  busy.value = true
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
    closeForm()
  } catch (cause) {
    error.value = message(cause, t('lifeEvents.saveError'))
  } finally {
    busy.value = false
  }
}
async function remove(item: LifeEvent) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await lifeEventsApi.remove(item.id)
    items.value = items.value.filter((event) => event.id !== item.id)
  } catch (cause) {
    error.value = message(cause, t('lifeEvents.deleteError'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageCard v-if="isMine || items.length" :title="t('lifeEvents.title')" heading="h2">
    <template v-if="isMine" #actions>
      <Button v-if="!showForm" @click="showForm = true">{{ t('lifeEvents.add') }}</Button>
    </template>
    <form v-if="showForm" class="form" @submit.prevent="create">
      <FormRow stacked :label="t('lifeEvents.kind')">
        <IconSelect v-model="kind" :options="kindOptions" :label="t('lifeEvents.kind')" />
      </FormRow>
      <FormRow stacked :label="t('lifeEvents.name')" for-id="le-title">
        <input id="le-title" v-model="title" maxlength="120" required />
      </FormRow>
      <FormRow stacked :label="t('lifeEvents.date')" for-id="le-date">
        <input id="le-date" v-model="happenedOn" type="date" required />
      </FormRow>
      <FormRow stacked :label="t('lifeEvents.privacy')">
        <IconSelect v-model="privacy" :options="privacyOptions" :label="t('lifeEvents.privacy')" />
      </FormRow>
      <div class="form__actions">
        <Button type="submit" :disabled="busy || !title.trim() || !happenedOn">{{
          t('lifeEvents.save')
        }}</Button>
        <Button variant="default" @click="closeForm">{{ t('page.cancel') }}</Button>
      </div>
    </form>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <LoadingRows v-if="loading" :rows="2" />
    <ul v-else-if="items.length" class="list">
      <li v-for="item in items" :key="item.id" class="item">
        <Icon :icon="KIND_ICONS[item.kind]" class="item__icon" aria-hidden="true" />
        <div class="item__main">
          <strong>{{ t(`lifeEvents.kind.${item.kind}`) }}</strong>
          <span class="item__title">{{ item.title }}</span>
          <time class="item__meta" :datetime="item.happenedOn">{{
            new Date(`${item.happenedOn}T00:00:00`).toLocaleDateString(intlLocale(), {
              dateStyle: 'medium',
            })
          }}</time>
        </div>
        <Icon
          v-if="isMine"
          :icon="PRIVACY_ICONS[item.privacy]"
          class="item__privacy"
          role="img"
          :aria-label="t(`privacy.${item.privacy}`)"
        />
        <Button v-if="isMine" variant="default" :disabled="busy" @click="remove(item)">{{
          t('lifeEvents.delete')
        }}</Button>
      </li>
    </ul>
    <p v-else-if="!showForm" class="empty">
      {{ t('lifeEvents.empty') }} {{ t('lifeEvents.emptyHint') }}
    </p>
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
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item:first-child {
  padding-top: 0;
}
.item__icon {
  flex: none;
  color: var(--c-brand);
  font-size: 20px;
}
.item__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.item__title {
  overflow-wrap: anywhere;
}
.empty {
  margin: 0;
  color: var(--c-text-muted);
}
.item__meta,
.item__privacy {
  color: var(--c-text-muted);
}
.item__privacy {
  flex: none;
  margin-top: 2px;
}
</style>
