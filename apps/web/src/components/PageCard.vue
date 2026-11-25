<script setup lang="ts">
/** Kartu halaman penuh: header abu dengan judul dan aksi, isi di bawahnya (pola sama dengan kartu kolom kanan). */
defineProps<{ title: string }>()
</script>

<template>
  <section class="pcard">
    <header class="pcard__head">
      <h1 class="pcard__title">{{ title }}</h1>
      <div class="pcard__actions"><slot name="actions" /></div>
    </header>
    <div class="pcard__body"><slot /></div>
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
</style>
