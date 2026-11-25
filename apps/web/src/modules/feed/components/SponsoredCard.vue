<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { request } from '@/plugins/http'

type Sponsored = {
  id: number
  title: string
  body: string
  imageUrl: string | null
  linkUrl: string
}
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
import PageCard from '@/components/PageCard.vue'
</script>

<template>
  <PageCard v-if="item" class="sponsored" quiet :title="t('sponsored.title')" heading="h2" flush>
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
  </PageCard>
</template>

<style scoped>
.sponsored {
  margin-bottom: var(--sp-3);
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
