<script setup lang="ts">
import { intlLocale, t } from '@retrobook/shared/i18n'
import { onMounted, ref, watch } from 'vue'
import { useReportsStore } from '@/modules/reports/stores'
import type { AdminReport, ReportAction, ReportStatus } from '@/modules/reports/services/types'

const reports = useReportsStore()
const note = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)
const isUser = (r: AdminReport) => r.targetType === 'USER'
onMounted(() => void reports.fetch())
watch(
  () => reports.status,
  () => {
    reports.selectedId = null
    void reports.fetch()
  },
)
watch(
  () => reports.selectedId,
  () => {
    note.value = ''
    error.value = ''
  },
)
function date(value: string) {
  return new Date(value).toLocaleString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function preview(r: AdminReport) {
  if (!r.target) return t('admin.reports.targetGone')
  return 'content' in r.target
    ? r.target.content || t('admin.common.imageTag')
    : t('admin.reports.profileOf', { username: r.target.username })
}
function authorOf(r: AdminReport) {
  return r.target ? ('author' in r.target ? r.target.author : r.target) : null
}
async function decide(status: 'REVIEWED' | 'DISMISSED', action?: ReportAction) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await reports.decide(status, action, note.value.trim())
    notice.value = t('admin.reports.saved')
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.reports.saveError')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.common.communitySafety') }}</p>
      <h1>{{ t('admin.reports.title') }}</h1>
      <p class="page-description">{{ t('admin.reports.description') }}</p>
    </div>
    <span class="moderation-total">{{
      t('admin.reports.total', { count: reports.total.toLocaleString(intlLocale()) })
    }}</span>
  </div>
  <section class="surface-card reports-card">
    <div class="reports-list">
      <label class="moderation-control"
        ><span>{{ t('admin.common.status') }}</span
        ><select v-model="reports.status">
          <option value="PENDING">{{ t('admin.reports.status.PENDING') }}</option>
          <option value="REVIEWED">{{ t('admin.reports.status.REVIEWED') }}</option>
          <option value="DISMISSED">{{ t('admin.reports.status.DISMISSED') }}</option>
          <option value="">{{ t('admin.common.all') }}</option>
        </select></label
      >
      <p v-if="reports.error" class="user-error" role="alert">
        {{ reports.error }} <button @click="reports.fetch()">{{ t('admin.common.retry') }}</button>
      </p>
      <p v-else-if="!reports.items.length && !reports.loading" class="reports-empty">
        {{ t('admin.reports.empty') }}
      </p>
      <button
        v-for="r in reports.items"
        :key="r.id"
        class="reports-item"
        :class="{ 'reports-item--active': r.id === reports.selectedId }"
        @click="reports.selectedId = r.id"
      >
        <strong>{{ r.reason }} · {{ r.targetType }}</strong
        ><span>{{ preview(r).slice(0, 80) }}</span
        ><small>{{ date(r.createdAt) }} · {{ t(`admin.reports.status.${r.status}`) }}</small>
      </button>
      <button
        v-if="reports.nextCursor"
        class="button button--quiet"
        :disabled="reports.loading"
        @click="reports.fetch(true)"
      >
        {{ t('admin.common.loadMore') }}
      </button>
    </div>
    <div class="reports-detail">
      <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
      <p v-if="!reports.selected" class="reports-empty">{{ t('admin.reports.pick') }}</p>
      <template v-else>
        <h2>
          {{ reports.selected.reason }} · {{ reports.selected.targetType }} #{{
            reports.selected.targetId
          }}
        </h2>
        <p class="report-meta">
          {{ t('admin.reports.reportedBy') }}
          <strong>@{{ reports.selected.reporter.username }}</strong
          >, {{ date(reports.selected.createdAt) }}
        </p>
        <blockquote class="report-target">{{ preview(reports.selected) }}</blockquote>
        <p v-if="authorOf(reports.selected)" class="report-meta">
          {{ t('admin.reports.author') }}:
          <strong>@{{ authorOf(reports.selected)?.username }}</strong>
        </p>
        <p v-if="reports.selected.note" class="report-meta">
          {{ t('admin.reports.reporterNote', { note: reports.selected.note }) }}
        </p>
        <template v-if="reports.selected.status === 'PENDING'">
          <label class="moderation-control"
            ><span>{{ t('admin.reports.decisionNote') }}</span
            ><input v-model="note" maxlength="500"
          /></label>
          <p v-if="error" class="user-error" role="alert">{{ error }}</p>
          <div class="reports-actions">
            <button class="button button--quiet" :disabled="busy" @click="decide('DISMISSED')">
              {{ t('admin.reports.action.dismiss') }}
            </button>
            <button
              class="button button--quiet"
              :disabled="busy || isUser(reports.selected)"
              @click="decide('REVIEWED', 'HIDE_CONTENT')"
            >
              {{ t('admin.common.hide') }}
            </button>
            <button
              class="button button--danger"
              :disabled="busy || isUser(reports.selected)"
              @click="decide('REVIEWED', 'DELETE_CONTENT')"
            >
              {{ t('admin.common.delete') }}
            </button>
            <button
              class="button button--danger"
              :disabled="busy"
              @click="decide('REVIEWED', 'SUSPEND_USER')"
            >
              {{ t('admin.reports.action.suspend') }}
            </button>
          </div>
        </template>
        <p v-else class="report-meta">
          {{
            t('admin.reports.decided', {
              status: t(`admin.reports.status.${reports.selected.status as ReportStatus}`),
            })
          }}
        </p>
      </template>
    </div>
  </section>
</template>
