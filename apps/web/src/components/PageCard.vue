<script setup lang="ts">
/** Kartu halaman penuh: header abu dengan judul dan aksi, isi di bawahnya (pola sama dengan kartu kolom kanan). */
withDefaults(
  defineProps<{
    title: string
    heading?: 'h1' | 'h2'
    flush?: boolean
    /** Gaya kartu kolom samping (ref-5): judul huruf besar abu-abu kecil tanpa bar latar. */
    quiet?: boolean
  }>(),
  {
    heading: 'h1',
    flush: false,
    quiet: false,
  },
)
</script>

<template>
  <section class="pcard" :class="{ 'pcard--quiet': quiet }">
    <header class="pcard__head">
      <slot name="title">
        <component :is="heading" class="pcard__title">{{ title }}</component>
      </slot>
      <div class="pcard__actions"><slot name="actions" /></div>
    </header>
    <div v-if="$slots.default" class="pcard__body" :class="{ 'pcard__body--flush': flush }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.pcard {
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.pcard__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  min-height: 36px;
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
}
.pcard__title {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: bold;
}
.pcard__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.pcard--quiet .pcard__head {
  min-height: 0;
  padding: var(--sp-3) var(--sp-3) var(--sp-1);
  background: none;
  border-bottom: 0;
}
.pcard--quiet .pcard__title {
  color: var(--c-text-muted);
  font-size: var(--fs-small);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.pcard__body {
  padding: var(--sp-3);
}
.pcard__body--flush {
  padding: 0;
}
</style>
