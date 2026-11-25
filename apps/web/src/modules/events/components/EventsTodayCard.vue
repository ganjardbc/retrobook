<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { eventsApi, type EventItem } from '@/modules/events/services/api'

const events = ref<EventItem[]>([])

onMounted(async () => {
  // Hari menurut zona waktu pengguna (sama seperti kartu Birthdays).
  const from = new Date()
  const to = new Date(from)
  to.setHours(23, 59, 59, 999)
  try {
    events.value = (await eventsApi.list({ from: from.toISOString(), to: to.toISOString() })).items
  } catch {
    events.value = []
  }
})
import PageCard from '@/components/PageCard.vue'
</script>

<template>
  <PageCard v-if="events.length" class="etoday" :title="t('eventsToday.title')" heading="h2" flush>
    <ul class="list">
      <li v-for="e in events" :key="e.id" class="item">
        <Icon icon="mdi:calendar" class="item__icon" aria-hidden="true" />
        <span>
          <RouterLink class="item__name" :to="`/events/${e.id}`">{{ e.title }}</RouterLink>
          {{ new Date(e.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
        </span>
      </li>
    </ul>
  </PageCard>
</template>

<style scoped>
.etoday {
  margin-bottom: var(--sp-3);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item__icon {
  flex: none;
  margin-top: 1px;
  color: var(--c-brand);
  font-size: 16px;
}
.item__name {
  font-weight: bold;
}
</style>
