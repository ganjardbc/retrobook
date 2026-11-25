<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { request } from '@/plugins/http'

type Sponsored = { id: number; title: string; body: string; imageUrl: string | null; linkUrl: string }
const item = ref<Sponsored | null>(null)
// Tautan sudah divalidasi server (http, https, atau path internal); tetap hanya dirender sebagai href biasa.
const external = (url: string) => /^https?:\/\//.test(url)

// Kartu tambahan: gagal memuat tidak boleh mengganggu halaman.
onMounted(async () => {
  try {
    item.value = (await request<{ item: Sponsored | null }>('/sponsored')).item
  } catch {
    item.value = null
  }
})
</script>

<template>
  <section v-if="item" class="card" :aria-label="t('sponsored.title')">
    <h2 class="card__head">{{ t('sponsored.title') }}</h2>
    <a
      class="card__body"
      :href="item.linkUrl"
      :target="external(item.linkUrl) ? '_blank' : undefined"
      rel="noopener noreferrer nofollow"
    >
      <img v-if="item.imageUrl" class="card__img" :src="item.imageUrl" alt="" />
      <strong>{{ item.title }}</strong>
      <span class="card__text">{{ item.body }}</span>
    </a>
  </section>
</template>

<style scoped>
.card {
  margin-bottom: var(--sp-3);
  background: var(--c-card);
  border: var(--card-border);
}
.card__head {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-base);
}
.card__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
  color: var(--c-text);
  text-decoration: none;
}
.card__img {
  max-width: 100%;
}
.card__text {
  color: var(--c-text-muted);
  overflow-wrap: anywhere;
}
</style>
