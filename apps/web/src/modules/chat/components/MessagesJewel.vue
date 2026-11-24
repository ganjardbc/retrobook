<script setup lang="ts">
import type { Conversation } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { ref, watch } from 'vue'
import Avatar from '@/components/Avatar.vue'
import Jewel from '@/components/Jewel.vue'
import { chatApi } from '@/modules/chat/services/api'
import { useChatStore } from '@/modules/chat/stores'

const chat = useChatStore()
const open = ref(false)
const items = ref<Conversation[]>([])
const loading = ref(false)
const failed = ref(false)

// Jewel pesan: badge dari total belum dibaca; dropdown memuat percakapan terbaru (CHT-01).
watch(open, async (isOpen) => {
  if (!isOpen) return
  loading.value = true
  failed.value = false
  try {
    items.value = (await chatApi.conversations()).items
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

function pick(c: Conversation) {
  chat.openWindow(c.user)
  open.value = false
}
</script>

<template>
  <Jewel
    v-model:open="open"
    icon="mdi:message-text"
    :label="t('jewel.messages')"
    :count="chat.totalUnread"
  >
    <p v-if="loading && !items.length" class="note">{{ t('jewel.loading') }}</p>
    <p v-else-if="failed" class="note" role="alert">{{ t('jewel.error') }}</p>
    <p v-else-if="!items.length" class="note">{{ t('jewel.messages.empty') }}</p>
    <ul v-else class="list">
      <li v-for="c in items" :key="c.user.id">
        <button
          class="item"
          :class="{ 'is-new': c.unreadCount > 0 }"
          type="button"
          @click="pick(c)"
        >
          <Avatar :name="c.user.displayName" :src="c.user.avatarUrl" size="m" />
          <span class="item__body">
            <strong>{{ c.user.displayName }}</strong>
            <span class="item__text">{{ c.lastMessage.content }}</span>
          </span>
        </button>
      </li>
    </ul>
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
.item {
  display: flex;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  background: none;
  color: var(--c-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.item:hover {
  background: var(--c-hover-bg);
}
.is-new {
  background: var(--c-highlight);
}
.item__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.item__text {
  overflow: hidden;
  color: var(--c-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
