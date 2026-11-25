<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onBeforeUnmount, ref, watch } from 'vue'
import Avatar from '@/components/Avatar.vue'
import { friendsApi } from '@/modules/friends/services/api'

const props = defineProps<{ query: string; exclude: string[] }>()
const emit = defineEmits<{ pick: [user: UserSummary]; close: [] }>()

const users = ref<UserSummary[]>([])
const active = ref(0)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

// Cari di daftar teman sendiri (server menyaring BANNED dan diblokir); respons lama dibuang.
watch(
  () => props.query,
  (q) => {
    clearTimeout(timer)
    loading.value = true
    timer = setTimeout(async () => {
      const mine = ++seq
      try {
        const page = await friendsApi.list(null, q)
        if (mine === seq) users.value = page.items.filter((u) => !props.exclude.includes(u.id))
      } catch {
        if (mine === seq) users.value = []
      } finally {
        if (mine === seq) {
          loading.value = false
          active.value = 0
        }
      }
    }, 200)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))

/** Dipanggil textarea untuk tombol panah, Enter, Tab, dan Escape; true bila tombolnya dipakai. */
function handleKey(e: KeyboardEvent): boolean {
  if (e.key === 'Escape') return (emit('close'), true)
  if (!users.value.length) return false
  if (e.key === 'ArrowDown') return ((active.value = (active.value + 1) % users.value.length), true)
  if (e.key === 'ArrowUp') {
    active.value = (active.value - 1 + users.value.length) % users.value.length
    return true
  }
  if (e.key === 'Enter' || e.key === 'Tab') return (emit('pick', users.value[active.value]!), true)
  return false
}
defineExpose({ handleKey })
</script>

<template>
  <div class="tags" role="listbox" :aria-label="t('statusBox.tag.suggestions')">
    <p v-if="!users.length && !loading" class="tags__none">{{ t('statusBox.tag.none') }}</p>
    <!-- mousedown dicegah supaya textarea tidak kehilangan fokus sebelum pilihan terbaca. -->
    <div
      v-for="(u, i) in users"
      :key="u.id"
      class="tags__item"
      :class="{ 'tags__item--active': i === active }"
      role="option"
      :aria-selected="i === active"
      @mousedown.prevent="emit('pick', u)"
    >
      <Avatar :name="u.displayName" :src="u.avatarUrl" size="s" />
      <span>{{ u.displayName }}</span>
    </div>
  </div>
</template>

<style scoped>
.tags {
  max-height: 220px;
  overflow-y: auto;
  background: var(--c-card);
  border: 1px solid var(--c-border);
}
.tags__none {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  color: var(--c-text-muted);
}
.tags__item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
  cursor: pointer;
}
.tags__item--active,
.tags__item:hover {
  background: var(--c-hover-bg);
}
</style>
