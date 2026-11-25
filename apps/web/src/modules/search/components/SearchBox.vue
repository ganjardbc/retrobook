<script setup lang="ts">
import type { UserSummary } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from '@/components/Avatar.vue'
import { MIN_QUERY, searchApi } from '@/modules/search/services/api'

const router = useRouter()
const route = useRoute()
const id = useId()
const root = ref<HTMLElement | null>(null)
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const items = ref<UserSummary[]>([])
const open = ref(false)
/** -1: tidak ada yang dipilih; 0..n-1: hasil; n: baris "See all". */
const active = ref(-1)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

const term = computed(() => q.value.trim())
const ready = computed(() => term.value.length >= MIN_QUERY)
const showPanel = computed(() => open.value && ready.value)
const optionId = (i: number) => `${id}-opt-${i}`

// Cari setelah jeda mengetik; respons lama dibuang bila kata kunci sudah berganti.
function onInput() {
  clearTimeout(timer)
  active.value = -1
  if (!ready.value) {
    items.value = []
    seq++
    return
  }
  open.value = true
  timer = setTimeout(async () => {
    const mine = ++seq
    try {
      const page = await searchApi.people(term.value)
      if (mine === seq) items.value = page.items
    } catch {
      if (mine === seq) items.value = []
    }
  }, 250)
}

function seeAll() {
  if (!ready.value) return
  open.value = false
  void router.push({ name: 'search', query: { q: term.value } })
}

function pick(user: UserSummary) {
  open.value = false
  q.value = ''
  items.value = []
  void router.push(`/${user.username}`)
}

function onKeydown(e: KeyboardEvent) {
  const last = items.value.length // indeks baris "See all"
  if (e.key === 'ArrowDown' && showPanel.value) {
    e.preventDefault()
    active.value = active.value >= last ? 0 : active.value + 1
  } else if (e.key === 'ArrowUp' && showPanel.value) {
    e.preventDefault()
    active.value = active.value <= 0 ? last : active.value - 1
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const user = items.value[active.value]
    if (showPanel.value && user) pick(user)
    else seeAll()
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('click', onDocClick)
})

// Halaman hasil menentukan isi kotak (tautan langsung, tombol kembali).
watch(
  () => route.query.q,
  (v) => {
    if (route.name === 'search' && typeof v === 'string' && v !== q.value) q.value = v
  },
)
</script>

<template>
  <div ref="root" class="search" role="search">
    <div class="search__field">
      <input
        v-model="q"
        class="search__input"
        type="search"
        role="combobox"
        maxlength="80"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="showPanel"
        :aria-controls="`${id}-list`"
        :aria-activedescendant="showPanel && active >= 0 ? optionId(active) : undefined"
        :placeholder="t('search.placeholder')"
        :aria-label="t('search.placeholder')"
        @input="onInput"
        @focus="open = true"
        @keydown="onKeydown"
      />
      <button
        class="search__btn"
        type="button"
        :aria-label="t('search.button')"
        :title="t('search.button')"
        @click="seeAll"
      >
        <Icon icon="mdi:magnify" aria-hidden="true" />
      </button>
    </div>
    <div v-if="showPanel" :id="`${id}-list`" class="search__panel" role="listbox">
      <div
        v-for="(u, i) in items"
        :id="optionId(i)"
        :key="u.id"
        class="search__item"
        :class="{ 'search__item--active': i === active }"
        role="option"
        :aria-selected="i === active"
        @mousedown.prevent="pick(u)"
      >
        <Avatar :name="u.displayName" :src="u.avatarUrl" size="s" />
        <span class="search__name">{{ u.displayName }}</span>
      </div>
      <div
        :id="optionId(items.length)"
        class="search__item search__all"
        :class="{ 'search__item--active': active === items.length }"
        role="option"
        :aria-selected="active === items.length"
        @mousedown.prevent="seeAll"
      >
        {{ t('search.seeAll', { q: term }) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.search {
  position: relative;
  /* Lebar dasar 480 px (referensi: sekitar 470 sampai 520 px); menyusut bila navbar sempit. */
  flex: 1 1 480px;
  min-width: 0;
  max-width: 480px;
}
/* Kotak putih dengan sudut 2 px dan segmen ikon kaca pembesar abu terang di kanan (ref-2). */
.search__field {
  display: flex;
  height: 26px;
  overflow: hidden;
  background: var(--c-card);
  border: 1px solid var(--c-brand-dark);
  border-radius: 2px;
}
.search__field:focus-within {
  outline: 2px solid var(--c-text-on-brand);
}
.search__input {
  flex: 1;
  min-width: 0;
  padding: 0 var(--sp-2);
  border: 0;
  outline: 0;
  background: none;
  color: var(--c-text);
  font: inherit;
  font-size: var(--fs-post);
}
.search__input::-webkit-search-cancel-button {
  display: none;
}
.search__input::placeholder {
  color: var(--c-text-muted);
}
.search__btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--c-border-soft);
  background: var(--c-card-subtle);
  color: #4b4f56;
  font-size: 18px;
  cursor: pointer;
}
.search__btn:hover {
  color: var(--c-text);
}
.search__panel {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 20;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  color: var(--c-text);
}
.search__item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-2);
  cursor: pointer;
}
.search__item--active,
.search__item:hover {
  background: var(--c-hover-bg);
}
.search__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search__all {
  border-top: 1px solid var(--c-border-soft);
  color: var(--c-link);
}
@media (max-width: 640px) {
  .search {
    max-width: none;
  }
}
</style>
