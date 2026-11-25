<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import PostListPage from '@/modules/posts/components/PostListPage.vue'
import { postsApi } from '@/modules/posts/services/api'
</script>

<template>
  <PostListPage
    :title="t('otd.title')"
    :empty="t('otd.empty')"
    icon="mdi:calendar-clock-outline"
    :fetch-page="() => postsApi.onThisDay()"
  />
</template>
