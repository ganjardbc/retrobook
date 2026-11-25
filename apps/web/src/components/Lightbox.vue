<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { Icon } from '@iconify/vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

export type LightboxPhoto = { url: string; alt: string }
const props = defineProps<{ photos: LightboxPhoto[]; start: number }>()
const emit = defineEmits<{ close: [] }>()
const index = ref(props.start)
const root = ref<HTMLElement | null>(null)
let opener: Element | null = null

const go = (step: number) => {
  index.value = (index.value + step + props.photos.length) % props.photos.length
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
}
onMounted(() => {
  opener = document.activeElement
  document.addEventListener('keydown', onKey)
  void nextTick(() => root.value?.focus())
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  ;(opener as HTMLElement | null)?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      class="lb"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="photos[index]?.alt"
      @click.self="emit('close')"
    >
      <button
        class="lb__btn lb__close"
        type="button"
        :aria-label="t('lightbox.close')"
        @click="emit('close')"
      >
        <Icon icon="mdi:close" aria-hidden="true" />
      </button>
      <button
        v-if="photos.length > 1"
        class="lb__btn lb__prev"
        type="button"
        :aria-label="t('lightbox.prev')"
        @click="go(-1)"
      >
        <Icon icon="mdi:chevron-left" aria-hidden="true" />
      </button>
      <img
        v-if="photos[index]"
        class="lb__img"
        :src="photos[index]!.url"
        :alt="photos[index]!.alt"
      />
      <button
        v-if="photos.length > 1"
        class="lb__btn lb__next"
        type="button"
        :aria-label="t('lightbox.next')"
        @click="go(1)"
      >
        <Icon icon="mdi:chevron-right" aria-hidden="true" />
      </button>
      <p v-if="photos.length > 1" class="lb__count">
        {{ t('lightbox.count', { n: index + 1, total: photos.length }) }}
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.lb {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
}
.lb__img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
}
.lb__btn {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.15);
  color: var(--c-text-on-brand);
  font-size: 28px;
  cursor: pointer;
}
.lb__btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
.lb__btn:focus-visible {
  outline-color: var(--c-text-on-brand);
}
.lb__close {
  top: var(--sp-3);
  right: var(--sp-3);
}
.lb__prev {
  left: var(--sp-3);
}
.lb__next {
  right: var(--sp-3);
}
.lb__count {
  position: absolute;
  bottom: var(--sp-3);
  margin: 0;
  color: var(--c-text-on-brand);
}
</style>
