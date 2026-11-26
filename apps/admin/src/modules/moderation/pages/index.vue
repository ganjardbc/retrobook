<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { intlLocale, t } from '@retrobook/shared/i18n'
import AdminDataTable, { type TableColumn } from '@/components/AdminDataTable.vue'
import { useModerationStore } from '@/modules/moderation/stores'
import type {
  ModerationComment,
  ModerationItem,
  ModerationResource,
} from '@/modules/moderation/services/types'

const moderation = useModerationStore()
const selected = ref<string[]>([])
const actionError = ref('')
const notice = ref('')
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout>
const columns = computed<TableColumn<Record<string, unknown>>[]>(() => [
  { key: 'selection', label: '', width: '42px' },
  { key: 'content', label: t('admin.moderation.col.content') },
  { key: 'author', label: t('admin.moderation.col.author'), width: '150px' },
  { key: 'createdAt', label: t('admin.moderation.col.date'), width: '140px' },
  { key: 'reports', label: t('admin.moderation.col.reports'), width: '100px' },
  { key: 'state', label: t('admin.moderation.col.status'), width: '118px' },
])
const rows = computed(() => moderation.items as unknown as Record<string, unknown>[])
onMounted(() => void moderation.fetch())
watch(
  () => moderation.resource,
  () => {
    selected.value = []
    moderation.resetPagination()
    void moderation.fetch()
  },
)
watch([() => moderation.filter, () => moderation.from, () => moderation.to], () => {
  selected.value = []
  moderation.resetPagination()
  void moderation.fetch()
})
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    moderation.q = value
    selected.value = []
    moderation.resetPagination()
    void moderation.fetch()
  }, 250)
})
function setResource(value: ModerationResource) {
  moderation.resource = value
}
function item(row: Record<string, unknown>) {
  return row as unknown as ModerationItem
}
function comment(value: ModerationItem): value is ModerationComment {
  return 'post' in value
}
function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((value) => value !== id)
    : [...selected.value, id]
}
function date(value: string) {
  return new Date(value).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
function context(value: ModerationItem) {
  return comment(value)
    ? t('admin.moderation.context.comment', {
        name: value.post.author.displayName,
        content: value.post.content || t('admin.common.imageTag'),
      })
    : value.imageUrl
      ? t('admin.moderation.context.image')
      : ''
}
async function setHidden(row: Record<string, unknown>, hidden: boolean) {
  actionError.value = ''
  notice.value = ''
  try {
    await moderation.setHidden(item(row).id, hidden)
    selected.value = []
    notice.value = hidden ? t('admin.moderation.notice.hidden') : t('admin.moderation.notice.shown')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('admin.moderation.error.action')
  }
}
async function remove(row: Record<string, unknown>) {
  const content = item(row)
  if (
    !window.confirm(
      t(
        moderation.resource === 'posts'
          ? 'admin.moderation.confirm.deletePost'
          : 'admin.moderation.confirm.deleteComment',
        {
          username: content.author.username,
        },
      ),
    )
  )
    return
  actionError.value = ''
  notice.value = ''
  try {
    await moderation.remove(content.id)
    selected.value = []
    notice.value = t('admin.moderation.notice.deleted')
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('admin.moderation.error.delete')
  }
}
async function bulk(action: 'hide' | 'show' | 'delete') {
  if (!selected.value.length) return
  if (
    !window.confirm(t(`admin.moderation.confirm.bulk.${action}`, { count: selected.value.length }))
  )
    return
  const reason = window.prompt(t('admin.moderation.reasonPrompt'))?.trim() || undefined
  actionError.value = ''
  notice.value = ''
  try {
    const count = selected.value.length
    await moderation.bulk([...selected.value], action, reason)
    selected.value = []
    notice.value = t('admin.moderation.notice.bulk', { count })
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('admin.moderation.error.bulk')
  }
}
</script>

<template>
  <div class="page-heading moderation-heading">
    <div>
      <p class="eyebrow">{{ t('admin.common.communitySafety') }}</p>
      <h1>{{ t('admin.moderation.title') }}</h1>
      <p class="page-description">{{ t('admin.moderation.description') }}</p>
    </div>
    <span class="moderation-total">{{
      t('admin.moderation.total', { count: moderation.total.toLocaleString(intlLocale()) })
    }}</span>
  </div>
  <section class="surface-card moderation-card">
    <div class="moderation-tabs" role="tablist" :aria-label="t('admin.moderation.kind')">
      <button
        role="tab"
        :aria-selected="moderation.resource === 'posts'"
        :class="{ 'moderation-tab--active': moderation.resource === 'posts' }"
        @click="setResource('posts')"
      >
        {{ t('admin.moderation.tab.posts') }}</button><button
        role="tab"
        :aria-selected="moderation.resource === 'comments'"
        :class="{ 'moderation-tab--active': moderation.resource === 'comments' }"
        @click="setResource('comments')"
      >
        {{ t('admin.moderation.tab.comments') }}
      </button>
    </div>
    <div class="moderation-toolbar">
      <label class="moderation-search"
        ><span class="sr-only">{{ t('admin.moderation.searchLabel') }}</span
        ><span>⌕</span
        ><input
          v-model="searchInput"
          type="search"
          :placeholder="t('admin.moderation.searchPlaceholder')" /></label
      ><label class="moderation-control"
        ><span>{{ t('admin.moderation.filter') }}</span
        ><select v-model="moderation.filter">
          <option value="">{{ t('admin.moderation.filter.all') }}</option>
          <option value="hidden">{{ t('admin.moderation.filter.hidden') }}</option>
          <option value="reported">{{ t('admin.moderation.filter.reported') }}</option>
          <option value="flagged">{{ t('admin.nav.blockedWords') }}</option>
          <option value="deleted">{{ t('admin.moderation.filter.deleted') }}</option>
        </select></label
      ><label class="moderation-control"
        ><span>{{ t('admin.common.fromDate') }}</span
        ><input v-model="moderation.from" type="date" /></label
      ><label class="moderation-control"
        ><span>{{ t('admin.common.toDate') }}</span
        ><input v-model="moderation.to" type="date"
      /></label>
    </div>
    <div v-if="selected.length" class="bulk-toolbar">
      <strong>{{ t('admin.moderation.selected', { count: selected.length }) }}</strong><button
        class="button button--quiet"
        @click="bulk('hide')"
      >
        {{ t('admin.common.hide') }}</button
      ><button class="button button--quiet" @click="bulk('show')">
        {{ t('admin.common.show') }}</button
      ><button class="button button--danger" @click="bulk('delete')">
        {{ t('admin.moderation.deleteSelected') }}</button
      ><button class="bulk-clear" @click="selected = []">
        {{ t('admin.moderation.clearSelection') }}
      </button>
    </div>
    <p v-if="actionError" class="user-error" role="alert">{{ actionError }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="moderation.error" class="user-error" role="alert">
      {{ moderation.error }}
      <button @click="moderation.fetch">{{ t('admin.common.retry') }}</button>
    </p>
    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="moderation.loading"
      :empty-title="t('admin.moderation.empty')"
      :empty-description="t('admin.moderation.emptyHint')"
    >
      <template #cell-selection="{ row }"
        ><input
          type="checkbox"
          :checked="selected.includes(item(row).id)"
          :disabled="Boolean(item(row).deletedAt)"
          :aria-label="t('admin.moderation.selectItem', { id: String(row.id) })"
          @click.stop
          @change="toggle(item(row).id)"
      /></template>
      <template #cell-content="{ row }"
        ><div class="moderation-content">
          <p>{{ item(row).content || t('admin.moderation.imageContent') }}</p>
          <small v-if="context(item(row))">{{ context(item(row)) }}</small>
        </div></template
      >
      <template #cell-author="{ row }"
        ><span class="moderation-author"
          ><strong>{{ item(row).author.displayName }}</strong
          ><small>@{{ item(row).author.username }}</small></span
        ></template
      >
      <template #cell-createdAt="{ row }">{{ date(item(row).createdAt) }}</template>
      <template #cell-reports="{ row }"
        ><span :class="{ 'report-count--pending': item(row).reports.pending > 0 }">{{
          t('admin.moderation.pending', { count: item(row).reports.pending })
        }}</span
        ><small class="report-total">{{
          t('admin.moderation.totalReports', { count: item(row).reports.total })
        }}</small></template
      >
      <template #cell-state="{ row }"
        ><span v-if="item(row).deletedAt" class="moderation-state moderation-state--deleted">{{
          t('admin.moderation.state.deleted')
        }}</span
        ><span v-else-if="item(row).hidden" class="moderation-state moderation-state--hidden">{{
          t('admin.moderation.state.hidden')
        }}</span
        ><span v-else class="moderation-state moderation-state--visible">{{
          t('admin.moderation.state.visible')
        }}</span></template
      >
      <template #actions="{ row }"
        ><div v-if="!item(row).deletedAt" class="moderation-actions">
          <button
            class="row-action"
            :title="item(row).hidden ? t('admin.common.showAgain') : t('admin.common.hide')"
            :aria-label="item(row).hidden ? t('admin.common.showAgain') : t('admin.common.hide')"
            @click.stop="setHidden(row, !item(row).hidden)"
          >
            {{ item(row).hidden ? '◉' : '⊘' }}</button><button
            class="row-action row-action--delete"
            :title="t('admin.common.delete')"
            :aria-label="t('admin.common.delete')"
            @click.stop="remove(row)"
          >
            ×
          </button>
        </div>
        <span v-else class="muted-dash">—</span></template
      >
      <template #empty-action
        ><button
          v-if="moderation.filter || searchInput"
          class="button button--quiet"
          @click="
            () => {
              moderation.filter = ''
              moderation.from = ''
              moderation.to = ''
              searchInput = ''
            }
          "
        >
          {{ t('admin.moderation.clearFilters') }}
        </button></template
      >
    </AdminDataTable>
    <div class="table-pagination">
      <span
        >{{ t('admin.table.showing', { shown: moderation.items.length, total: moderation.total })
        }}<template v-if="moderation.total">{{
          t('admin.table.pageSuffix', { page: moderation.pageNumber })
        }}</template></span
      >
      <div>
        <button
          :disabled="moderation.pageIndex === 0 || moderation.loading"
          :aria-label="t('admin.table.prev')"
          @click="moderation.previousPage"
        >
          ←</button
        ><span class="page-number">{{ moderation.pageNumber }}</span
        ><button
          :disabled="moderation.nextCursor === null || moderation.loading"
          :aria-label="t('admin.table.next')"
          @click="moderation.nextPage"
        >
          →
        </button>
      </div>
    </div>
  </section>
</template>
