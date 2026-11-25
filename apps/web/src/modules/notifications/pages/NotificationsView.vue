<script setup lang="ts">
import type { AppNotification } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { formatTime } from '@/helpers/time'
import { useAuthStore } from '@/modules/auth/stores'
import { notificationTarget } from '../helpers'
import { notificationsApi } from '../services/api'
import { useNotificationsStore } from '../stores'

const auth = useAuthStore()
const store = useNotificationsStore()
const items = ref<AppNotification[]>([])
const nextCursor = ref<number | null>(null)
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    const page = await notificationsApi.list(nextCursor.value, 20)
    items.value.push(...page.items)
    nextCursor.value = page.nextCursor
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
async function markAll() {
  store.unread = (await notificationsApi.markRead()).count
  items.value = items.value.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
}
onMounted(() => void load())
</script>

<template>
  <PageCard :title="t('notifications.title')" flush>
    <template #actions>
      <Button v-if="store.unread" variant="default" @click="markAll">{{
        t('notifications.markAll')
      }}</Button>
    </template>
    <ul v-if="items.length" class="list">
      <li v-for="n in items" :key="n.id" :class="{ 'is-new': !n.readAt }">
        <RouterLink class="item" :to="notificationTarget(n, auth.user?.username)">
          <Avatar v-if="n.actor" :name="n.actor.displayName" :src="n.actor.avatarUrl" size="m" />
          <span class="item__body">
            <span>{{ n.text }}</span>
            <span class="item__time">{{ formatTime(n.createdAt) }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
    <LoadingRows v-if="loading" />
    <p v-else-if="failed" class="note" role="alert">
      {{ t('jewel.error') }}
      <Button variant="default" @click="load">{{ t('feed.retry') }}</Button>
    </p>
    <EmptyState
      v-else-if="!items.length"
      icon="mdi:earth"
      :title="t('jewel.notifications.empty')"
    />
    <p v-else-if="nextCursor" class="note">
      <Button variant="default" @click="load">{{ t('notifications.more') }}</Button>
    </p>
  </PageCard>
</template>

<style scoped>
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.list li + li {
  border-top: 1px solid var(--c-border-soft);
}
.is-new {
  background: var(--c-highlight);
}
.item {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  color: var(--c-text);
}
.item:hover {
  background: var(--c-hover-bg);
  text-decoration: none;
}
.item__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.item__time {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
  text-align: center;
}
</style>
