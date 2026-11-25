<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatTime } from '@/helpers/time'
import { type ChatWindow, useChatStore } from '@/modules/chat/stores'

const props = defineProps<{ win: ChatWindow }>()
const chat = useChatStore()
const router = useRouter()
const draft = ref('')
const log = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)

const thread = () => chat.thread(props.win.user.id)
// "Seen" di bawah pesan terakhir saya yang sudah dibaca lawan; pesan yang lebih baru belum terbaca.
const seenId = computed(
  () =>
    thread()
      .messages.filter((m) => m.senderId !== props.win.user.id && !m.pending && m.readAt)
      .at(-1)?.id ?? null,
)

function scrollToEnd() {
  void nextTick(() => log.value && (log.value.scrollTop = log.value.scrollHeight))
}
// Pesan baru di ujung bawah menggulir ke bawah; memuat yang lama (prepend) tidak.
watch(() => thread().messages.at(-1)?.id, scrollToEnd)
watch(
  () => thread().loaded,
  (loaded) => loaded && scrollToEnd(),
)
watch(
  () => props.win.minimized,
  (min) => {
    if (!min) {
      scrollToEnd()
      void nextTick(() => input.value?.focus())
    }
  },
)
onMounted(() => {
  scrollToEnd()
  input.value?.focus()
})

// Buka percakapan ini di halaman Messages; jendela melayang ditutup agar tidak ganda.
function expand() {
  void router.push({ path: '/messages', query: { with: props.win.user.id } })
  chat.closeWindow(props.win.user.id)
}

function submit() {
  const text = draft.value
  draft.value = ''
  void chat.send(props.win.user.id, text)
}
</script>

<template>
  <section class="win" :class="{ 'win--min': win.minimized }">
    <header class="win__head">
      <h2 class="win__title">{{ win.user.displayName }}</h2>
      <button
        class="win__btn"
        type="button"
        :aria-expanded="!win.minimized"
        :aria-label="t('chat.toggle', { name: win.user.displayName })"
        :title="t('chat.toggle', { name: win.user.displayName })"
        @click="chat.toggleMinimize(win.user.id)"
      >
        <Icon
          :icon="win.minimized ? 'mdi:window-maximize' : 'mdi:window-minimize'"
          aria-hidden="true"
        />
      </button>
      <button
        class="win__btn"
        type="button"
        :aria-label="t('chat.expand', { name: win.user.displayName })"
        :title="t('chat.expand', { name: win.user.displayName })"
        @click="expand"
      >
        <Icon icon="mdi:arrow-expand" aria-hidden="true" />
      </button>
      <button
        class="win__btn"
        type="button"
        :aria-label="t('chat.close', { name: win.user.displayName })"
        :title="t('chat.close', { name: win.user.displayName })"
        @click="chat.closeWindow(win.user.id)"
      >
        <Icon icon="mdi:close" aria-hidden="true" />
      </button>
    </header>

    <template v-if="!win.minimized">
      <div ref="log" class="win__log" role="log" aria-live="polite">
        <p v-if="thread().failed && !thread().messages.length" class="win__note" role="alert">
          {{ t('chat.error.load') }}
        </p>
        <button
          v-if="thread().nextCursor !== null"
          class="win__older"
          type="button"
          :disabled="thread().loading"
          @click="chat.loadOlder(win.user.id)"
        >
          {{ t('chat.older') }}
        </button>
        <p v-if="thread().loaded && !thread().messages.length" class="win__note">
          {{ t('chat.thread.empty') }}
        </p>
        <!-- Isi pesan selalu teks, tidak pernah HTML. -->
        <div
          v-for="m in thread().messages"
          :key="m.id"
          class="msg"
          :class="{ 'msg--mine': m.senderId !== win.user.id, 'msg--pending': m.pending }"
        >
          <span class="msg__text" :title="formatTime(m.createdAt)">{{ m.content }}</span>
          <span v-if="m.id === seenId" class="msg__seen">{{ t('chat.seen') }}</span>
          <span v-if="m.failed" class="msg__failed">
            {{ t('chat.failed') }}
            <button type="button" @click="chat.retry(win.user.id, m.id)">
              {{ t('chat.retry') }}
            </button>
          </span>
        </div>
      </div>
      <p v-if="chat.typing[win.user.id]" class="win__typing" role="status">
        {{ t('chat.typing', { name: win.user.displayName }) }}
      </p>
      <form class="win__form" @submit.prevent="submit">
        <input
          ref="input"
          v-model="draft"
          maxlength="2000"
          autocomplete="off"
          :placeholder="t('chat.input')"
          :aria-label="t('chat.input')"
          @input="chat.notifyTyping(win.user.id, draft)"
        />
      </form>
    </template>
  </section>
</template>

<style scoped>
.win {
  display: flex;
  flex-direction: column;
  width: 260px;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-bottom: 0;
}
.win__head {
  display: flex;
  background: var(--c-brand);
  border-bottom: 1px solid var(--c-brand-dark);
}
/* Header bukan tombol: hanya tiga ikon berukuran sama yang bisa diklik. */
.win__title {
  flex: 1;
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  overflow: hidden;
  color: var(--c-text-on-brand);
  font-size: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.win__btn {
  display: grid;
  width: 30px;
  place-items: center;
  border: 0;
  background: none;
  color: var(--c-text-on-brand);
  font-size: var(--fs-title);
  cursor: pointer;
}
.win__btn:hover {
  background: var(--c-brand-dark);
}
.win__log {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  height: 260px;
  padding: var(--sp-2);
  overflow-y: auto;
}
.win__note {
  margin: 0;
  color: var(--c-text-muted);
  text-align: center;
}
.win__older {
  align-self: center;
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.msg {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.msg--mine {
  align-items: flex-end;
}
.msg__text {
  max-width: 85%;
  padding: var(--sp-1) var(--sp-2);
  background: var(--c-card-subtle);
  border: 1px solid var(--c-border-soft);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.msg--mine .msg__text {
  background: var(--c-brand);
  border-color: var(--c-brand-dark);
  color: var(--c-text-on-brand);
}
.msg--pending {
  opacity: 0.6;
}
.win__typing {
  margin: 0;
  padding: 0 var(--sp-2) var(--sp-1);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.msg__seen {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.msg__failed {
  color: var(--c-danger);
  font-size: var(--fs-small);
}
.msg__failed button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-link);
  font: inherit;
  cursor: pointer;
}
.win__form {
  padding: var(--sp-1);
  border-top: 1px solid var(--c-border);
}
.win__form input {
  width: 100%;
}
</style>
