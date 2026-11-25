<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PageCard from '@/components/PageCard.vue'
import { ApiRequestError } from '@/plugins/http'
import DateBadge from '../components/DateBadge.vue'
import RsvpButtons from '../components/RsvpButtons.vue'
import { eventsApi, type EventItem, type RsvpStatus } from '../services/api'

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
  <PageCard :title="event?.title ?? t('events.title')">
    <template #actions>
      <RouterLink to="/events">{{ t('events.title') }}</RouterLink>
    </template>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="event" class="event">
      <DateBadge :iso="event.startsAt" />
      <div class="event__main">
        <p class="event__meta">
          {{ new Date(event.startsAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
          }}<template v-if="event.location"> · {{ event.location }}</template>
        </p>
        <p v-if="event.description" class="event__desc">{{ event.description }}</p>
        <p class="event__meta">{{ t('event.rsvpCount', { count: event.rsvpCount }) }}</p>
        <RsvpButtons :current="event.myRsvp" @set="setRsvp" />
      </div>
    </div>
  </PageCard>
</template>

<style scoped>
.event {
  display: flex;
  gap: var(--sp-3);
}
.event__main {
  display: grid;
  flex: 1;
  gap: var(--sp-2);
  min-width: 0;
}
.event__main p {
  margin: 0;
}
.event__meta {
  color: var(--c-text-muted);
}
.event__desc {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
