<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { computed, ref } from 'vue'
import Avatar from '@/components/Avatar.vue'
import { useChatStore } from '@/modules/chat/stores'

const chat = useChatStore()
const query = ref('')
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? chat.friends.filter((f) => f.user.displayName.toLowerCase().includes(q)) : chat.friends
})
</script>

<template>
  <section class="chat" :aria-label="t('chat.title')">
    <h2 class="chat__head">
      {{ t('chat.title') }}
      <span v-if="!chat.connected" class="chat__offline" role="status">{{
        t('chat.offline')
      }}</span>
    </h2>
    <p v-if="chat.friendsFailed" class="chat__note" role="alert">{{ t('jewel.error') }}</p>
    <p v-else-if="!chat.friends.length && !chat.friendsLoading" class="chat__note">
      {{ t('chat.empty') }}
    </p>
    <ul v-else class="chat__list">
      <li v-for="f in shown" :key="f.user.id">
        <button class="chat__row" type="button" @click="chat.openWindow(f.user)">
          <Avatar :name="f.user.displayName" :src="f.user.avatarUrl" size="s" />
          <span class="chat__name">{{ f.user.displayName }}</span>
          <span
            v-if="f.unreadCount"
            class="chat__unread"
            :aria-label="t('chat.unread', { n: f.unreadCount })"
            >{{ f.unreadCount }}</span
          >
          <template v-if="f.online">
            <span v-if="f.client" class="chat__client">{{ t(`chat.client.${f.client}`) }}</span>
            <!-- Socket putus: status tidak diketahui, titik menjadi abu. -->
            <span
              class="chat__dot"
              :class="{ 'chat__dot--stale': !chat.connected }"
              aria-hidden="true"
            />
          </template>
        </button>
      </li>
    </ul>
    <div class="chat__search">
      <input
        v-model="query"
        type="search"
        maxlength="80"
        :placeholder="t('chat.search')"
        :aria-label="t('chat.search')"
      />
    </div>
  </section>
</template>

<style scoped>
/* Kolom kanan tinggi penuh di bawah navbar (UI spec 4, ChatSidebar). */
.chat {
  position: sticky;
  top: calc(var(--h-navbar) + var(--sp-3));
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--h-navbar) - 2 * var(--sp-3));
  background: var(--c-card);
  border: var(--card-border);
}
.chat__head {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-base);
}
.chat__offline {
  margin-left: var(--sp-2);
  color: var(--c-text-muted);
  font-weight: normal;
}
.chat__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
.chat__list {
  flex: 1;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.chat__row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-1) var(--sp-3);
  border: 0;
  background: none;
  color: var(--c-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.chat__row:hover {
  background: var(--c-hover-bg);
}
.chat__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat__client {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.chat__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-online);
}
.chat__dot--stale {
  background: var(--c-text-muted);
}
.chat__unread {
  min-width: 14px;
  padding: 0 3px;
  background: var(--c-badge);
  color: var(--c-text-on-brand);
  font-size: 10px;
  font-weight: bold;
  line-height: 14px;
  text-align: center;
}
.chat__search {
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
}
.chat__search input {
  width: 100%;
}
</style>
