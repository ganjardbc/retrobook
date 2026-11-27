<script setup lang="ts">
import type { ChatFriend, ChatMessage, Conversation, UserSummary } from '@retrobook/shared'
import { isUuid } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import { formatClock, formatDayLabel, formatShortAgo, formatTime } from '@/helpers/time'
import { useDismissOnOutside } from '@/composables/dismissOnOutside'
import { useMediaQuery } from '@/composables/mobile'
import { chatApi } from '@/modules/chat/services/api'
import { type LocalMessage, useChatStore } from '@/modules/chat/stores'
import { useAuthStore } from '@/modules/auth/stores'

type Contact = {
  user: UserSummary
  online: boolean
  lastSeenAt: string | null
  unreadCount: number
  lastMessage?: ChatMessage | LocalMessage
}

const chat = useChatStore()
const auth = useAuthStore()
const conversations = ref<Conversation[]>([])
const listLoading = ref(true)
const listFailed = ref(false)
const query = ref('')
// Percakapan terbuka disimpan di URL (?with=<id>) supaya tetap sama setelah reload; jendela chat melayang memakai ini juga.
// replace, bukan push: berpindah percakapan tidak menambah riwayat, jadi panah kembali tetap keluar dari halaman.
const route = useRoute()
const router = useRouter()
const selectedId = computed(() => {
  const id = route.query.with
  return isUuid(id) ? id : null
})
function select(id: string | null) {
  const { with: _old, ...rest } = route.query
  void router.replace({ query: id === null ? rest : { ...rest, with: String(id) } })
}
const draft = ref('')
const log = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const actionError = ref(false)
useDismissOnOutside(menuRoot, menuOpen)
const compact = useMediaQuery('(max-width: 700px)')

const contacts = computed<Contact[]>(() => {
  const friends = new Map(chat.friends.map((friend) => [friend.user.id, friend]))
  const recentIds = new Set<string>()
  const recent = conversations.value.map((conversation) => {
    const friend = friends.get(conversation.user.id)
    recentIds.add(conversation.user.id)
    return toContact(conversation.user, friend, conversation)
  })
  const others = chat.friends
    .filter((friend) => !recentIds.has(friend.user.id))
    .filter(
      (friend) =>
        !friend.hidden ||
        friend.user.id === selectedId.value ||
        chat.threads[friend.user.id]?.messages.length,
    )
    .map((friend) => toContact(friend.user, friend))
  return [...recent, ...others]
    .map((contact) => {
      const latest = chat.threads[contact.user.id]?.messages.at(-1)
      return { ...contact, lastMessage: latest ?? contact.lastMessage }
    })
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
      return (
        bTime - aTime ||
        Number(b.online) - Number(a.online) ||
        a.user.displayName.localeCompare(b.user.displayName)
      )
    })
})

const visibleContacts = computed(() => {
  const value = query.value.trim().toLowerCase()
  return value
    ? contacts.value.filter((contact) =>
        `${contact.user.displayName} ${contact.user.username}`.toLowerCase().includes(value),
      )
    : contacts.value
})
const activeContact = computed(
  () => contacts.value.find((contact) => contact.user.id === selectedId.value) ?? null,
)
const activeThread = computed(() =>
  selectedId.value === null ? null : chat.thread(selectedId.value),
)
const seenId = computed(
  () =>
    activeThread.value?.messages
      .filter(
        (message) => message.senderId !== selectedId.value && !message.pending && message.readAt,
      )
      .at(-1)?.id ?? null,
)
// Pesan diberi label hari bila berbeda dari pesan sebelumnya (pemisah ala WhatsApp).
const rows = computed(() => {
  let last = ''
  return (activeThread.value?.messages ?? []).map((message) => {
    const day = new Date(message.createdAt).toDateString()
    const label = day === last ? null : formatDayLabel(message.createdAt)
    last = day
    return { message, label }
  })
})
const isMobileConversation = computed(() => selectedId.value !== null)

function toContact(user: UserSummary, friend?: ChatFriend, conversation?: Conversation): Contact {
  return {
    user,
    online: friend?.online ?? false,
    lastSeenAt: friend?.lastSeenAt ?? null,
    unreadCount: friend?.unreadCount ?? conversation?.unreadCount ?? 0,
    lastMessage: conversation?.lastMessage,
  }
}

async function loadConversations() {
  listLoading.value = true
  listFailed.value = false
  try {
    conversations.value = (await chatApi.conversations()).items
  } catch {
    listFailed.value = true
  } finally {
    listLoading.value = false
  }
}

function scrollToEnd() {
  void nextTick(() => {
    if (log.value) log.value.scrollTop = log.value.scrollHeight
  })
}

async function loadOlder() {
  if (selectedId.value === null || !activeThread.value || !log.value) return
  const element = log.value
  const oldHeight = element.scrollHeight
  const oldTop = element.scrollTop
  await chat.loadOlder(selectedId.value)
  await nextTick(() => {
    if (log.value) log.value.scrollTop = oldTop + log.value.scrollHeight - oldHeight
  })
}

function submit() {
  if (selectedId.value === null) return
  const text = draft.value
  draft.value = ''
  void chat.send(selectedId.value, text)
}

function mine(message: ChatMessage) {
  return message.senderId === auth.user?.id
}

function preview(contact: Contact) {
  return contact.lastMessage?.content || t('messages.start')
}

// Kembali ke halaman sebelumnya; tanpa riwayat (tab baru) ke beranda.
function exit() {
  if (window.history.state?.back) router.back()
  else void router.push('/')
}

async function runAction(kind: 'clear' | 'remove') {
  const contact = activeContact.value
  menuOpen.value = false
  if (!contact) return
  const key = kind === 'clear' ? 'messages.clear.confirm' : 'messages.delete.confirm'
  if (!window.confirm(t(key, { name: contact.user.displayName }))) return
  actionError.value = false
  try {
    if (kind === 'clear') await chat.clearHistory(contact.user.id)
    else await chat.removeSession(contact.user.id)
    // Daftar percakapan lokal ikut dibersihkan supaya pratinjau lama tidak tampil.
    conversations.value = conversations.value.filter((c) => c.user.id !== contact.user.id)
    if (kind === 'remove') backToList()
  } catch {
    actionError.value = true
  }
}

function backToList() {
  select(null)
  draft.value = ''
}

watch(
  [visibleContacts, compact, selectedId],
  ([items, isCompact]) => {
    if (selectedId.value === null && items.length && !query.value && !isCompact) {
      select(items[0]!.user.id)
    }
  },
  { immediate: true },
)

// ?with= menunjuk ke orang yang bukan teman (atau tidak ada): buang setelah daftar teman termuat.
watch(
  () => [chat.friendsLoading, chat.friends.length, selectedId.value] as const,
  ([loading, count, id]) => {
    if (!loading && count && id !== null && !activeContact.value) select(null)
  },
)

watch(
  () => activeContact.value?.user.id,
  async (userId) => {
    if (userId === undefined) return
    await chat.loadLatest(userId)
    await chat.markRead(userId)
    scrollToEnd()
    await nextTick(() => input.value?.focus())
  },
)

watch(
  () => activeThread.value?.messages.at(-1)?.id,
  () => {
    scrollToEnd()
    const last = activeThread.value?.messages.at(-1)
    if (last && !mine(last) && selectedId.value !== null) void chat.markRead(selectedId.value)
  },
)

onMounted(() => {
  if (!chat.friends.length && !chat.friendsLoading) void chat.loadFriends()
  void loadConversations()
})
</script>

<template>
  <section class="messages" :class="{ 'messages--active': isMobileConversation }">
    <aside class="messages__sidebar" :aria-label="t('messages.title')">
      <header class="messages__sidebar-head">
        <button class="messages__exit" type="button" :aria-label="t('messages.exit')" @click="exit">
          <Icon icon="mdi:arrow-left" aria-hidden="true" />
        </button>
        <h1>{{ t('messages.title') }}</h1>
        <span
          class="messages__connection"
          :class="{ 'messages__connection--off': !chat.connected }"
        >
          <i /> {{ chat.connected ? t('chat.online') : t('chat.offline') }}
        </span>
      </header>
      <label class="messages__search">
        <Icon icon="mdi:magnify" aria-hidden="true" />
        <input v-model="query" type="search" :placeholder="t('messages.search')" />
      </label>
      <p v-if="listFailed && !contacts.length" class="messages__state" role="alert">
        {{ t('messages.loadError') }}
        <button type="button" @click="loadConversations">{{ t('feed.retry') }}</button>
      </p>
      <p v-else-if="listLoading && !contacts.length" class="messages__state" role="status">
        {{ t('common.loading') }}
      </p>
      <p v-else-if="!visibleContacts.length" class="messages__state">
        {{ query ? t('messages.noResults') : t('chat.empty') }}
      </p>
      <ul v-else class="messages__contacts">
        <li v-for="contact in visibleContacts" :key="contact.user.id">
          <button
            class="messages__contact"
            :class="{ 'messages__contact--active': contact.user.id === selectedId }"
            type="button"
            @click="select(contact.user.id)"
          >
            <span class="messages__avatar">
              <Avatar :name="contact.user.displayName" :src="contact.user.avatarUrl" size="m" />
              <i v-if="contact.online" aria-label="Online" />
            </span>
            <span class="messages__contact-copy">
              <strong>{{ contact.user.displayName }}</strong>
              <span>{{ preview(contact) }}</span>
            </span>
            <span class="messages__contact-meta">
              <small v-if="contact.lastMessage">{{
                formatTime(contact.lastMessage.createdAt)
              }}</small>
              <i v-if="contact.unreadCount" class="messages__unread">{{ contact.unreadCount }}</i>
            </span>
          </button>
        </li>
      </ul>
      <footer class="messages__sidebar-foot">
        {{ t('messages.friendsCount', { count: chat.friends.length }) }}
      </footer>
    </aside>

    <main class="messages__conversation">
      <template v-if="activeContact">
        <header class="messages__thread-head">
          <button
            class="messages__back"
            type="button"
            :aria-label="t('messages.back')"
            @click="backToList"
          >
            <Icon icon="mdi:arrow-left" aria-hidden="true" />
          </button>
          <RouterLink class="messages__who" :to="`/${activeContact.user.username}`">
            <Avatar
              :name="activeContact.user.displayName"
              :src="activeContact.user.avatarUrl"
              size="m"
            />
          </RouterLink>
          <div class="messages__person">
            <h2>
              <RouterLink :to="`/${activeContact.user.username}`">{{
                activeContact.user.displayName
              }}</RouterLink>
            </h2>
            <p>
              <template v-if="activeContact.online">{{ t('chat.online') }}</template>
              <template v-else-if="activeContact.lastSeenAt">
                {{ t('chat.lastSeen') }} {{ formatShortAgo(activeContact.lastSeenAt) }}
              </template>
              <template v-else>{{ t('chat.offline') }}</template>
            </p>
          </div>
          <div ref="menuRoot" class="messages__menu">
            <button
              class="messages__more"
              type="button"
              aria-haspopup="true"
              :aria-expanded="menuOpen"
              :aria-label="t('messages.more')"
              :title="t('messages.more')"
              @click="menuOpen = !menuOpen"
            >
              <Icon icon="mdi:dots-horizontal" aria-hidden="true" />
            </button>
            <div v-if="menuOpen" class="messages__dropdown" role="menu">
              <button type="button" role="menuitem" @click="runAction('clear')">
                {{ t('messages.clear') }}
              </button>
              <button type="button" role="menuitem" @click="runAction('remove')">
                {{ t('messages.delete') }}
              </button>
            </div>
          </div>
        </header>

        <div ref="log" class="messages__log" role="log" aria-live="polite">
          <button
            v-if="activeThread?.nextCursor !== null"
            class="messages__older"
            type="button"
            :disabled="activeThread?.loading"
            @click="loadOlder"
          >
            {{ t('chat.older') }}
          </button>
          <p
            v-if="activeThread?.failed && !activeThread.messages.length"
            class="messages__state"
            role="alert"
          >
            {{ t('chat.error.load') }}
            <button type="button" @click="chat.loadLatest(activeContact.user.id)">
              {{ t('feed.retry') }}
            </button>
          </p>
          <p
            v-else-if="activeThread?.loaded && !activeThread.messages.length"
            class="messages__welcome"
          >
            <Avatar
              :name="activeContact.user.displayName"
              :src="activeContact.user.avatarUrl"
              size="l"
            />
            <strong>{{ t('messages.startWith', { name: activeContact.user.displayName }) }}</strong>
            <span>{{ t('messages.sayHello') }}</span>
          </p>
          <template v-for="{ message, label } in rows" :key="message.id">
            <p v-if="label" class="messages__day">
              <span>{{ label }}</span>
            </p>
            <div
              class="messages__message"
              :class="{
                'messages__message--mine': mine(message),
                'messages__message--pending': message.pending,
              }"
            >
              <span class="messages__bubble">
                <span class="messages__text">{{ message.content }}</span>
                <time
                  class="messages__time"
                  :datetime="message.createdAt"
                  :title="formatTime(message.createdAt)"
                  >{{ formatClock(message.createdAt) }}</time
                >
              </span>
              <span v-if="message.id === seenId" class="messages__meta">{{ t('chat.seen') }}</span>
              <span v-if="message.failed" class="messages__failed">
                {{ t('chat.failed') }}
                <button type="button" @click="chat.retry(activeContact.user.id, message.id)">
                  {{ t('chat.retry') }}
                </button>
              </span>
            </div>
          </template>
        </div>
        <p v-if="actionError" class="messages__typing" role="alert">
          {{ t('messages.actionError') }}
        </p>
        <p v-if="chat.typing[activeContact.user.id]" class="messages__typing" role="status">
          {{ t('chat.typing', { name: activeContact.user.displayName }) }}
        </p>
        <form class="messages__composer" @submit.prevent="submit">
          <input
            ref="input"
            v-model="draft"
            type="text"
            maxlength="2000"
            autocomplete="off"
            :placeholder="t('chat.input')"
            :aria-label="t('chat.input')"
            @input="chat.notifyTyping(activeContact.user.id, draft)"
          />
          <button type="submit" :disabled="!draft.trim()" :aria-label="t('chat.send')">
            <Icon icon="mdi:send" aria-hidden="true" />
          </button>
        </form>
      </template>
      <div v-else class="messages__blank">
        <span class="messages__blank-icon"
          ><Icon icon="mdi:message-text-outline" aria-hidden="true"
        /></span>
        <h2>{{ t('messages.chooseTitle') }}</h2>
        <p>{{ t('messages.chooseBody') }}</p>
      </div>
    </main>
  </section>
</template>

<style scoped>
/* Selaras dengan ChatSidebar dan ChatWindow: token, sudut kotak, header biru. */
.messages {
  display: grid;
  grid-template-columns: minmax(250px, 310px) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
  color: var(--c-text);
}
.messages__sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: var(--card-border);
  background: var(--c-card);
}
.messages__sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
}
.messages__exit {
  display: grid;
  width: 24px;
  height: 24px;
  flex: none;
  place-items: center;
  border: 0;
  background: none;
  color: var(--c-link);
  font-size: var(--fs-title);
  cursor: pointer;
}
.messages__exit:hover {
  background: var(--c-hover-bg);
}
.messages h1 {
  flex: 1;
  margin: 0;
  font-size: var(--fs-base);
}
.messages__connection {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.messages__connection i,
.messages__avatar > i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-online);
}
.messages__connection--off i {
  background: var(--c-text-muted);
}
.messages__search {
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--c-border-soft);
}
.messages__search svg {
  display: none;
}
.messages__search input {
  width: 100%;
}
.messages__contacts {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.messages__contact {
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
.messages__contact:hover {
  background: var(--c-hover-bg);
}
.messages__contact--active {
  background: var(--c-card-subtle);
  box-shadow: inset 3px 0 0 var(--c-brand);
}
.messages__avatar {
  position: relative;
  flex: none;
}
.messages__avatar > i {
  position: absolute;
  right: 0;
  bottom: 0;
  border: 2px solid var(--c-card);
  box-sizing: content-box;
}
.messages__contact-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.messages__contact-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.messages__contact-copy > span {
  overflow: hidden;
  color: var(--c-text-muted);
  font-size: var(--fs-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.messages__contact-meta {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: var(--sp-1);
  color: var(--c-text-muted);
}
.messages__contact-meta small {
  font-size: var(--fs-small);
  white-space: nowrap;
}
.messages__unread {
  min-width: 14px;
  padding: 0 3px;
  background: var(--c-badge);
  color: var(--c-text-on-brand);
  font-size: 10px;
  font-style: normal;
  font-weight: bold;
  line-height: 14px;
  text-align: center;
}
.messages__sidebar-foot {
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.messages__conversation {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: var(--c-card);
}
.messages__thread-head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-brand);
  border-bottom: 1px solid var(--c-brand-dark);
  color: var(--c-text-on-brand);
}
.messages__person {
  min-width: 0;
  flex: 1;
}
.messages__person h2 {
  overflow: hidden;
  margin: 0;
  color: var(--c-text-on-brand);
  font-size: var(--fs-base);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.messages__person p {
  margin: 0;
  color: var(--c-text-on-brand);
  font-size: var(--fs-small);
  opacity: 0.8;
}
.messages__person h2 a {
  color: inherit;
}
.messages__person h2 a:hover {
  text-decoration: underline;
}
.messages__who {
  display: flex;
  flex: none;
}
.messages__menu {
  position: relative;
}
.messages__dropdown {
  position: absolute;
  top: calc(100% + var(--sp-1));
  right: 0;
  z-index: 5;
  min-width: 180px;
  background: var(--c-card);
  border: var(--card-border);
  box-shadow: 0 2px 6px rgb(0 0 0 / 20%);
}
.messages__dropdown button {
  display: block;
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  background: none;
  color: var(--c-text);
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.messages__dropdown button:hover {
  background: var(--c-hover-bg);
}
.messages__more,
.messages__back {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  border: 0;
  background: none;
  color: var(--c-text-on-brand);
  font-size: var(--fs-title);
  cursor: pointer;
}
.messages__more:hover,
.messages__back:hover {
  background: var(--c-brand-dark);
  text-decoration: none;
}
.messages__back {
  display: none;
}
.messages__log {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-3);
  overflow-y: auto;
}
.messages__older {
  align-self: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.messages__older:disabled {
  color: var(--c-text-muted);
  cursor: wait;
}
.messages__message {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
}
.messages__message--mine {
  align-items: flex-end;
}
.messages__day {
  align-self: center;
  margin: var(--sp-2) 0;
}
.messages__day span {
  padding: 2px var(--sp-3);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border-soft);
  border-radius: var(--radius);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.messages__text {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.messages__time {
  align-self: flex-end;
  flex: none;
  font-size: 10px;
  line-height: 1.6;
  opacity: 0.7;
}
.messages__bubble {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-2);
  max-width: min(74%, 560px);
  padding: var(--sp-1) var(--sp-2);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border-soft);
}
.messages__message--mine .messages__bubble {
  background: var(--c-brand);
  border-color: var(--c-brand-dark);
  color: var(--c-text-on-brand);
}
.messages__message--pending {
  opacity: 0.6;
}
.messages__meta {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.messages__failed {
  color: var(--c-danger);
  font-size: var(--fs-small);
}
.messages__failed button,
.messages__state button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.messages__typing {
  margin: 0;
  padding: 0 var(--sp-3) var(--sp-1);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.messages__composer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border);
}
.messages__composer input {
  width: 100%;
}
.messages__composer button {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border: 1px solid var(--c-brand-dark);
  border-radius: var(--radius);
  background: var(--c-brand);
  color: var(--c-text-on-brand);
  font-size: var(--fs-title);
  cursor: pointer;
}
.messages__composer button:disabled {
  opacity: 0.45;
  cursor: default;
}
.messages__state,
.messages__welcome,
.messages__blank {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: var(--sp-2);
  margin: auto;
  padding: var(--sp-4);
  color: var(--c-text-muted);
  text-align: center;
}
.messages__welcome strong,
.messages__blank h2 {
  margin: 0;
  color: var(--c-text);
  font-size: var(--fs-post);
}
.messages__welcome span,
.messages__blank p {
  margin: 0;
}
.messages__blank-icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border: var(--card-border);
  border-radius: 50%;
  font-size: 27px;
}
@media (max-width: 700px) {
  .messages {
    grid-template-columns: minmax(0, 1fr);
  }
  .messages__sidebar {
    border-right: 0;
  }
  .messages__conversation {
    display: none;
  }
  .messages--active .messages__sidebar {
    display: none;
  }
  .messages--active .messages__conversation {
    display: flex;
  }
  .messages__back {
    display: grid;
  }
  .messages__bubble {
    max-width: 84%;
  }
}
</style>
