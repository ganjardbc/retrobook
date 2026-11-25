<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import Button from '@/components/Button.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadingRows from '@/components/LoadingRows.vue'
import PageCard from '@/components/PageCard.vue'
import { postsApi } from '@/modules/posts/services/api'
import { commentsApi } from '@/modules/posts/services/comments'
import { activityApi, type ActivityItem } from '@/modules/profile/services/activity'

const items = ref<ActivityItem[]>([])
const cursor = ref<string | null>(null)
const loading = ref(false)
const failed = ref(false)
const loaded = ref(false)

async function load(more = false) {
  loading.value = true
  failed.value = false
  try {
    const page = await activityApi.list(more ? cursor.value : null)
    items.value = more ? [...items.value, ...page.items] : page.items
    cursor.value = page.nextCursor
    loaded.value = true
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function remove(item: ActivityItem) {
  if (!window.confirm(t('activity.delete.confirm'))) return
  failed.value = false
  try {
    if (item.type === 'POST') await postsApi.remove(item.id)
    else if (item.type === 'COMMENT') await commentsApi.remove(item.id)
    else await postsApi.unlike(item.postId)
    items.value = items.value.filter((i) => !(i.type === item.type && i.id === item.id))
  } catch {
    failed.value = true
  }
}

const when = (iso: string) => new Date(iso).toLocaleString()
onMounted(() => void load())
</script>

<template>
  <div class="page">
    <p v-if="failed" class="form-error" role="alert">{{ t('activity.error') }}</p>
    <PageCard :title="t('activity.title')" flush>
      <ul v-if="items.length" class="list">
        <li v-for="i in items" :key="`${i.type}-${i.id}`" class="row">
          <div class="row__body">
            <strong>{{ t(`activity.${i.type}`) }}</strong>
            <span class="row__time">{{ when(i.createdAt) }}</span>
            <p class="row__text">{{ i.text }}</p>
          </div>
          <Button variant="default" @click="remove(i)">{{
            i.type === 'LIKE' ? t('activity.unlike') : t('activity.delete')
          }}</Button>
        </li>
      </ul>
      <LoadingRows v-else-if="loading" />
      <EmptyState
        v-else-if="loaded"
        icon="mdi:history"
        :title="t('activity.empty')"
        :hint="t('activity.emptyHint')"
      />
      <div v-if="cursor" class="more">
        <Button variant="default" :disabled="loading" @click="load(true)">{{
          t('activity.more')
        }}</Button>
      </div>
    </PageCard>
  </div>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-top: 1px solid var(--c-border-soft);
}
.row:first-child {
  border-top: 0;
}
.row__body {
  flex: 1;
  min-width: 0;
}
.row__time {
  margin-left: var(--sp-2);
  color: var(--c-text-muted);
  font-size: var(--fs-small);
}
.row__text {
  margin: var(--sp-1) 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.more {
  padding: var(--sp-3);
  text-align: center;
}
</style>
