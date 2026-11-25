<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Button from '@/components/Button.vue'
import { ApiRequestError } from '@/plugins/http'
import { eventsApi, type EventItem, type RsvpStatus } from '../services/api'

const STATUSES: RsvpStatus[] = ['GOING', 'MAYBE', 'DECLINED']
const route = useRoute()
const event = ref<EventItem | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    event.value = await eventsApi.get(Number(route.params.id))
  } catch (cause) {
    // 404 (juga untuk pembuat yang diblokir) memakai pesan yang sama.
    error.value =
      cause instanceof ApiRequestError && cause.status !== 404
        ? cause.messages.join(' ')
        : t('event.notFound')
  }
})

async function setRsvp(status: RsvpStatus) {
  if (!event.value) return
  try {
    const result = await eventsApi.rsvp(event.value.id, status)
    event.value.myRsvp = result.status
    event.value.rsvpCount = result.rsvpCount
  } catch (cause) {
    error.value = cause instanceof ApiRequestError ? cause.messages.join(' ') : t('error.network')
  }
}
</script>

<template>
  <main class="event">
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="event">
      <h1>{{ event.title }}</h1>
      <p>
        {{ new Date(event.startsAt).toLocaleString()
        }}<span v-if="event.location"> · {{ event.location }}</span>
      </p>
      <p v-if="event.description" class="event__desc">{{ event.description }}</p>
      <p>{{ t('event.rsvpCount', { count: event.rsvpCount }) }}</p>
      <div class="event__actions">
        <Button
          v-for="status in STATUSES"
          :key="status"
          variant="default"
          :disabled="event.myRsvp === status"
          @click="setRsvp(status)"
          >{{ t(`event.rsvp.${status}`) }}</Button
        >
      </div>
    </template>
    <RouterLink to="/events">{{ t('menu.events') }}</RouterLink>
  </main>
</template>

<style scoped>
.event {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
h1,
p {
  margin: 0;
}
.event__desc {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.event__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
</style>
