<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { t } from '@retrobook/shared/i18n'
import Button from '@/components/Button.vue'
import { ApiRequestError } from '@/plugins/http'
import { eventsApi, type EventItem, type RsvpStatus } from '../services/api'

const events = ref<EventItem[]>([])
const title = ref('')
const description = ref('')
const location = ref('')
const startsAt = ref('')
const error = ref('')
const saving = ref(false)
async function load() {
  try {
    events.value = (await eventsApi.list()).items
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Event gagal dimuat.'
  }
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
    title.value = ''
    description.value = ''
    location.value = ''
    startsAt.value = ''
  } catch (cause) {
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'Event gagal dibuat.'
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
    error.value =
      cause instanceof ApiRequestError ? cause.messages.join(' ') : 'RSVP gagal disimpan.'
  }
}
const label = (status: RsvpStatus) => t(`event.rsvp.${status}`)
const localDate = (value: string) => new Date(value).toLocaleString()
onMounted(() => void load())
</script>

<template>
  <main class="events">
    <h1>Events</h1>
    <p v-if="error" role="alert">{{ error }}</p>
    <form class="events__form" @submit.prevent="create">
      <label>Nama event<input v-model="title" required maxlength="120" /></label
      ><label>Deskripsi<textarea v-model="description" maxlength="3000" rows="2" /></label
      ><label>Lokasi<input v-model="location" maxlength="120" /></label
      ><label>Waktu<input v-model="startsAt" type="datetime-local" required /></label
      ><Button type="submit" :disabled="saving">Buat event</Button>
    </form>
    <section v-for="event in events" :key="event.id" class="events__item">
      <h2>
        <RouterLink :to="`/events/${event.id}`">{{ event.title }}</RouterLink>
      </h2>
      <p>
        {{ localDate(event.startsAt) }}<span v-if="event.location"> · {{ event.location }}</span>
      </p>
      <p v-if="event.description">{{ event.description }}</p>
      <p>{{ t('event.rsvpCount', { count: event.rsvpCount }) }}</p>
      <div class="events__actions">
        <Button
          v-for="status in ['GOING', 'MAYBE', 'DECLINED'] as RsvpStatus[]"
          :key="status"
          variant="default"
          :disabled="event.myRsvp === status"
          @click="setRsvp(event, status)"
          >{{ label(status) }}</Button
        >
      </div>
    </section>
    <p v-if="!events.length">Belum ada event mendatang.</p>
  </main>
</template>

<style scoped>
.events {
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
.events__form {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3);
  background: var(--c-card-subtle);
}
label {
  display: grid;
  gap: 4px;
}
.events__item {
  padding: var(--sp-3);
  border: 1px solid var(--c-border-soft);
}
.events__item p {
  margin: var(--sp-1) 0;
}
.events__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
</style>
