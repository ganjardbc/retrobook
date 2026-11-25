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
import PageCard from '@/components/PageCard.vue'
</script>

<template>
  <PageCard v-if="tags.length" class="trending" :title="t('trending.title')" heading="h2" flush>
    <ul class="list">
      <li v-for="item in tags" :key="item.tag" class="item">
        <RouterLink class="item__tag" :to="{ name: 'hashtag', params: { tag: item.tag } }"
          >#{{ item.tag }}</RouterLink
        >
        <span class="item__count">{{ t('trending.count', { count: item.count }) }}</span>
      </li>
    </ul>
  </PageCard>
</template>

<style scoped>
.trending {
  margin-bottom: var(--sp-3);
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
