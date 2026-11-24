<script setup lang="ts">
import type { TrendingTag } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { searchApi } from '@/modules/search/services/api'

const tags = ref<TrendingTag[]>([])

onMounted(async () => {
  try {
    tags.value = (await searchApi.trending()).items
  } catch {
    tags.value = []
  }
})
</script>

<template>
  <section v-if="tags.length" class="card" :aria-label="t('trending.title')">
    <h2 class="card__head">{{ t('trending.title') }}</h2>
    <ul class="list">
      <li v-for="item in tags" :key="item.tag" class="item">
        <RouterLink class="item__tag" :to="{ name: 'hashtag', params: { tag: item.tag } }"
          >#{{ item.tag }}</RouterLink
        >
        <span class="item__count">{{ t('trending.count', { count: item.count }) }}</span>
      </li>
    </ul>
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
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  flex-direction: column;
  padding: var(--sp-2) var(--sp-3);
}
.item + .item {
  border-top: 1px solid var(--c-border-soft);
}
.item__tag {
  color: var(--c-link);
  font-weight: bold;
  overflow-wrap: anywhere;
}
.item__count {
  color: var(--c-text-muted);
}
</style>
