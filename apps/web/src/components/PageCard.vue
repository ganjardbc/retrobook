<script setup lang="ts">
/** Kartu halaman penuh: header abu dengan judul dan aksi, isi di bawahnya (pola sama dengan kartu kolom kanan). */
withDefaults(defineProps<{ title: string; heading?: 'h1' | 'h2'; flush?: boolean }>(), {
  heading: 'h1',
  flush: false,
})
</script>

<template>
  <section class="pcard">
    <header class="pcard__head">
      <component :is="heading" class="pcard__title">{{ title }}</component>
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
.pcard__body {
  padding: var(--sp-3);
}
.pcard__body--flush {
  padding: 0;
}
</style>
