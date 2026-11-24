<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { localDate } from '@/helpers/date'
import { friendsApi } from '@/modules/friends/services/api'

const people = ref<UserSummary[]>([])

onMounted(async () => {
  try {
    people.value = (await friendsApi.birthdays(localDate())).items
  } catch {
    people.value = []
  }
})
</script>

<template>
  <section v-if="people.length" class="card" :aria-label="t('birthdays.title')">
    <h2 class="card__head">{{ t('birthdays.title') }}</h2>
    <ul class="list">
      <li v-for="p in people" :key="p.id" class="item">
        <Icon icon="mdi:cake-variant" class="item__icon" aria-hidden="true" />
        <span>
          <RouterLink class="item__name" :to="`/${p.username}`">{{ p.displayName }}</RouterLink>
          {{ t('birthdays.today') }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.card {
  margin-bottom: var(--sp-3);
  background: var(--c-card);
  border: var(--card-border);
}
.card__head {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-base);
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
