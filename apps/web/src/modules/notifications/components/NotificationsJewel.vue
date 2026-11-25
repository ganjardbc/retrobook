<script setup lang="ts">
import type { AppNotification } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import Jewel from '@/components/Jewel.vue'
import { formatTime } from '@/helpers/time'
import { useAuthStore } from '@/modules/auth/stores'
import { notificationTarget } from '@/modules/notifications/helpers'
import { useNotificationsStore } from '@/modules/notifications/stores'

const auth = useAuthStore()
const store = useNotificationsStore()
const open = ref(false)

onMounted(() => store.start(() => open.value))
onBeforeUnmount(() => store.stop())
watch(open, (isOpen) => {
  if (isOpen) void store.open()
})

const target = (n: AppNotification) => notificationTarget(n, auth.user?.username)
</script>

<template>
  <Jewel
    v-model:open="open"
    icon="mdi:earth"
    :label="t('jewel.notifications')"
    :count="store.unread"
  >
    <p v-if="store.loading && !store.items.length" class="note">{{ t('jewel.loading') }}</p>
    <p v-else-if="store.failed" class="note" role="alert">{{ t('jewel.error') }}</p>
    <p v-else-if="!store.items.length" class="note">{{ t('jewel.notifications.empty') }}</p>
    <ul v-else class="list">
      <li v-for="n in store.items" :key="n.id" :class="{ 'is-new': store.fresh.has(n.id) }">
        <RouterLink class="item" :to="target(n)" @click="open = false">
          <Avatar v-if="n.actor" :name="n.actor.displayName" :src="n.actor.avatarUrl" size="m" />
          <span class="item__body">
            <span class="item__text">{{ n.text }}</span>
            <span class="item__time">{{ formatTime(n.createdAt) }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
    <RouterLink class="all" to="/notifications" @click="open = false">{{
      t('jewel.notifications.seeAll')
    }}</RouterLink>
  </Jewel>
</template>

<style scoped>
.note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
.list {
  max-height: 400px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
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
.all {
  display: block;
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
  text-align: center;
}
</style>
