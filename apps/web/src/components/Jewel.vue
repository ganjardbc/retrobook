<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = defineProps<{
  icon: string
  label: string
  count?: number
  /** Ada lebih banyak dari `count` (mis. hanya halaman pertama yang termuat): tampil "10+". */
  more?: boolean
}>()
const open = defineModel<boolean>('open', { default: false })

const root = ref<HTMLElement | null>(null)
const button = ref<HTMLButtonElement | null>(null)
const panelId = useId()

const badge = computed(() => {
  const n = props.count ?? 0
  if (n <= 0) return ''
  return n > 99 ? '99+' : props.more ? `${n}+` : String(n)
})

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    button.value?.focus()
  }
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="jewel">
    <button
      ref="button"
      class="jewel__btn"
      :class="{ 'jewel__btn--on': badge }"
      type="button"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-controls="panelId"
      :aria-label="badge ? `${label} (${badge})` : label"
      @click="open = !open"
    >
      <Icon :icon="icon" aria-hidden="true" />
      <span v-if="badge" class="jewel__badge" aria-hidden="true">{{ badge }}</span>
    </button>
    <div v-if="open" :id="panelId" class="jewel__panel">
      <div class="jewel__title">{{ label }}</div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.jewel {
  position: relative;
}
.jewel__btn {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--sp-1) var(--sp-2);
  border: 0;
  background: none;
  /* Tanpa kabar: ikon gelap (referensi 2019); ada kabar: terang. */
  color: var(--c-brand-dark);
  font-size: 16px;
  cursor: pointer;
}
.jewel__btn--on,
.jewel__btn:hover,
.jewel__btn[aria-expanded='true'] {
  color: var(--c-text-on-brand);
}
.jewel__btn:hover,
.jewel__btn[aria-expanded='true'] {
  background: var(--c-brand-dark);
}
.jewel__badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 14px;
  padding: 0 3px;
  background: var(--c-badge);
  color: var(--c-text-on-brand);
  font-size: 10px;
  font-weight: bold;
  line-height: 14px;
  text-align: center;
}
.jewel__panel {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  width: 330px;
  max-width: calc(100vw - var(--sp-3) * 2);
  background: var(--c-card);
  border: 1px solid var(--c-border);
  color: var(--c-text);
  font-size: var(--fs-base);
}
.jewel__title {
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border);
  font-weight: bold;
}
</style>
