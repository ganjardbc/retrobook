<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import Avatar from '@/components/Avatar.vue'
import { useChatStore } from '@/modules/chat/stores'

const props = defineProps<{ inline?: boolean }>()
const emit = defineEmits<{ picked: [] }>()
const chat = useChatStore()
function pick(user: Parameters<typeof chat.openWindow>[0]) {
  chat.openWindow(user)
  emit('picked')
}
const query = ref('')
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? chat.friends.filter((f) => f.user.displayName.toLowerCase().includes(q)) : chat.friends
})
import { formatShortAgo } from '@/helpers/time'
</script>

<template>
  <section class="chat" :class="{ 'chat--inline': props.inline }" :aria-label="t('chat.title')">
    <h2 v-if="props.inline" class="chat__heading">{{ t('chat.title') }}</h2>
    <p v-if="!chat.connected" class="chat__offline" role="status">{{ t('chat.offline') }}</p>
    <div class="chat__scroll">
      <ul v-if="chat.activity.length" class="chat__ticker" :aria-label="t('chat.activity.label')">
        <li v-for="a in chat.activity" :key="`${a.type}-${a.id}`">
          <RouterLink class="chat__item" :to="`/posts/${a.postId}`">
            <Avatar :name="a.actor.displayName" :src="a.actor.avatarUrl" size="s" />
            <span class="chat__item-text">
              <strong>{{ a.actor.displayName }}</strong>
              {{
                t(`chat.activity.${a.type}`, {
                  owner:
                    a.postAuthor.id === a.actor.id
                      ? t('chat.activity.ownerSelf')
                      : t('chat.activity.owner', { name: a.postAuthor.displayName }),
                })
              }}
            </span>
          </RouterLink>
        </li>
      </ul>
      <p v-if="chat.friendsFailed" class="chat__note" role="alert">{{ t('jewel.error') }}</p>
      <p v-else-if="!chat.friends.length && !chat.friendsLoading" class="chat__note">
        {{ t('chat.empty') }}
      </p>
      <ul v-else class="chat__list">
        <li v-if="!shown.length" class="chat__note" role="status">{{ t('chat.search.empty') }}</li>
        <li v-for="f in shown" :key="f.user.id">
          <button class="chat__row" type="button" @click="pick(f.user)">
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
            <span v-else-if="f.lastSeenAt" class="chat__seen" :title="t('chat.lastSeen')">{{
              formatShortAgo(f.lastSeenAt)
            }}</span>
          </button>
        </li>
      </ul>
    </div>
    <div class="chat__search">
      <Icon icon="mdi:magnify" class="chat__search-icon" aria-hidden="true" />
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
/* Strip tetap di tepi kanan layar, tinggi penuh di bawah navbar (referensi profil Maret 2015). */
.chat {
  position: fixed;
  top: var(--h-navbar);
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: var(--w-chat);
  padding-top: var(--sp-3);
  border-left: var(--card-border);
}
/* UX-11: di bawah 900 px strip disembunyikan bersama kolom kanan. */
@media (max-width: 900px) {
  .chat {
    display: none;
  }
}
/* Varian di dalam laci menu: hanya tampil di laci yang terbuka (≤900 px), mengalir di bawah menu
   (bukan strip tetap). */
.chat.chat--inline {
  display: none;
}
@media (max-width: 900px) {
  .layout__left--open .chat.chat--inline {
    display: flex;
    position: static;
    flex: 1 1 0; /* mengisi sisa tinggi laci; .chat__scroll yang menggulir */
    min-height: 0;
    width: auto;
    margin-top: var(--sp-2);
    padding-top: 0;
    border-top: var(--card-border);
    border-left: 0;
  }
  /* Baris sejajar dengan baris menu di atasnya (padding kiri dan ukuran avatar yang sama). */
  .layout__left--open .chat--inline .chat__row,
  .layout__left--open .chat--inline .chat__item {
    padding-inline: var(--sp-2);
  }
  .layout__left--open .chat--inline .chat__note,
  .layout__left--open .chat--inline .chat__offline {
    padding-inline: var(--sp-2);
  }
}
.chat__heading {
  margin: 0;
  padding: var(--sp-2) var(--sp-2) var(--sp-1);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
  font-weight: bold;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.chat__offline {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  color: var(--c-text-muted);
}
.chat__note {
  margin: 0;
  padding: var(--sp-3);
  color: var(--c-text-muted);
}
.chat__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.chat__list,
.chat__ticker {
  margin: 0;
  padding: 0;
  list-style: none;
}
.chat__ticker li {
  border-bottom: var(--card-border);
}
.chat__item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
  color: var(--c-text);
  text-decoration: none;
}
.chat__item:hover {
  background: var(--c-hover-bg);
}
.chat__item-text {
  min-width: 0;
  overflow-wrap: anywhere;
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
  color: var(--c-online);
  font-size: 10px;
}
.chat__seen {
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
  position: relative;
  border-top: 1px solid var(--c-border-soft);
}
.chat__search-icon {
  position: absolute;
  top: 50%;
  left: var(--sp-2);
  color: var(--c-text-muted);
  font-size: 20px;
  transform: translateY(-50%);
  pointer-events: none;
}
.chat__search input {
  width: 100%;
  padding-left: calc(var(--sp-2) * 4);
  border: 0;
  border-radius: 0;
  box-sizing: border-box;
}
</style>
