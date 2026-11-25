<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import FormRow from '@/components/FormRow.vue'
import PageCard from '@/components/PageCard.vue'
import { ApiRequestError } from '@/plugins/http'
import DateBadge from '../components/DateBadge.vue'
import RsvpButtons from '../components/RsvpButtons.vue'
import { eventsApi, type EventItem, type RsvpStatus } from '../services/api'

const events = ref<EventItem[]>([])
const showForm = ref(false)
const title = ref('')
const description = ref('')
const location = ref('')
const startsAt = ref('')
const error = ref('')
const saving = ref(false)
const loading = ref(true)

const message = (cause: unknown, fallback: string) =>
  cause instanceof ApiRequestError ? cause.messages.join(' ') : fallback

async function load() {
  try {
    events.value = (await eventsApi.list()).items
  } catch (cause) {
    error.value = message(cause, t('events.loadError'))
  } finally {
    loading.value = false
  }
}
function closeForm() {
  showForm.value = false
  title.value = description.value = location.value = startsAt.value = ''
}
async function create() {
  error.value = ''
  saving.value = true
  try {
    const event = await eventsApi.create({
      title: title.value.trim(),
      description: description.value.trim(),
      location: location.value.trim(),
      startsAt: new Date(startsAt.value).toISOString(),
    })
    events.value.push(event)
    events.value.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    closeForm()
  } catch (cause) {
    error.value = message(cause, t('events.createError'))
  } finally {
    saving.value = false
  }
}
async function setRsvp(event: EventItem, status: RsvpStatus) {
  try {
    const result = await eventsApi.rsvp(event.id, status)
    event.myRsvp = result.status
    event.rsvpCount = result.rsvpCount
  } catch (cause) {
    error.value = message(cause, t('events.rsvpError'))
  }
}
const when = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
onMounted(() => void load())
</script>

<template>
  <PageCard :title="t('events.title')">
    <template #actions>
      <Button v-if="!showForm" @click="showForm = true">{{ t('events.create') }}</Button>
    </template>
    <form v-if="showForm" class="form" @submit.prevent="create">
      <FormRow :label="t('events.name')" for-id="ev-title">
        <input id="ev-title" v-model="title" required maxlength="120" />
      </FormRow>
      <FormRow :label="t('events.description')" for-id="ev-desc">
        <textarea id="ev-desc" v-model="description" maxlength="3000" rows="2" />
      </FormRow>
      <FormRow :label="t('events.location')" for-id="ev-loc">
        <input id="ev-loc" v-model="location" maxlength="120" />
      </FormRow>
      <FormRow :label="t('events.time')" for-id="ev-time">
        <input id="ev-time" v-model="startsAt" type="datetime-local" required />
      </FormRow>
      <div class="form__actions">
        <Button type="submit" :disabled="saving || !title.trim() || !startsAt">{{
          t('events.save')
        }}</Button>
        <Button variant="default" @click="closeForm">{{ t('page.cancel') }}</Button>
      </div>
    </form>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">{{ t('page.loading') }}</p>
    <ul v-if="events.length" class="list">
      <li v-for="event in events" :key="event.id" class="item">
        <DateBadge :iso="event.startsAt" />
        <div class="item__main">
          <RouterLink class="item__title" :to="`/events/${event.id}`">{{ event.title }}</RouterLink>
          <span class="item__meta"
            >{{ when(event.startsAt)
            }}<template v-if="event.location"> · {{ event.location }}</template></span
          >
          <span class="item__meta">{{ t('event.rsvpCount', { count: event.rsvpCount }) }}</span>
        </div>
        <RsvpButtons :current="event.myRsvp" @set="(s) => setRsvp(event, s)" />
      </li>
    </ul>
    <EmptyState
      v-else-if="!loading"
      icon="mdi:calendar-blank-outline"
      :title="t('events.empty')"
      :hint="t('events.emptyHint')"
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
  padding-left: 118px;
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
  padding: var(--sp-3) 0;
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item:first-child {
  padding-top: 0;
}
.item__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.item__title {
  font-weight: bold;
  overflow-wrap: anywhere;
}
.item__meta {
  color: var(--c-text-muted);
}
@media (max-width: 560px) {
  .form__actions {
    padding-left: 0;
  }
  .item {
    flex-wrap: wrap;
  }
}
</style>
