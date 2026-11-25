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
import { Icon } from '@iconify/vue'
</script>

<template>
  <PageCard
    v-if="tags.length"
    class="trending"
    quiet
    :title="t('trending.title')"
    heading="h2"
    flush
  >
    <ul class="list">
      <li v-for="item in tags" :key="item.tag" class="item">
        <Icon icon="mdi:trending-up" class="item__icon" aria-hidden="true" />
        <span class="item__text">
          <RouterLink class="item__tag" :to="{ name: 'hashtag', params: { tag: item.tag } }"
            >#{{ item.tag }}</RouterLink
          >
          <span class="item__count">{{ t('trending.count', { count: item.count }) }}</span>
        </span>
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
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
}
.item__icon {
  flex: none;
  margin-top: 2px;
  color: var(--c-link);
  font-size: 16px;
}
.item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
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
