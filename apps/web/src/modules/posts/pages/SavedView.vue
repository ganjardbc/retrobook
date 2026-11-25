<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import PostListPage from '@/modules/posts/components/PostListPage.vue'
import { postsApi } from '@/modules/posts/services/api'
</script>

<template>
  <PostListPage
    :title="t('saved.title')"
    :empty="t('saved.empty')"
    icon="mdi:bookmark-outline"
    :fetch-page="(cursor) => postsApi.saved(cursor)"
  />
</template>
