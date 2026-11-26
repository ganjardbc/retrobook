<script setup lang="ts">
import { intlLocale, t } from '@retrobook/shared/i18n'
import { onMounted, reactive, ref } from 'vue'
import {
  adminAuditLogsApi,
  type AuditFilters,
  type AuditLog,
} from '@/modules/audit-logs/services/api'

const filters = reactive<AuditFilters>({ adminId: '', action: '', from: '', to: '' })
const items = ref<AuditLog[]>([])
const total = ref(0)
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const error = ref('')
async function load(more = false) {
  loading.value = true
  error.value = ''
  try {
    const page = await adminAuditLogsApi.list(filters, more ? nextCursor.value : null)
    items.value = more ? [...items.value, ...page.items] : page.items
    total.value = page.total
    nextCursor.value = page.nextCursor
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.audit.loadError')
  } finally {
    loading.value = false
  }
}
const when = (v: string) => new Date(v).toLocaleString(intlLocale())
onMounted(() => void load())
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.audit.eyebrow') }}</p>
      <h1>{{ t('admin.nav.auditLogs') }}</h1>
      <p class="page-description">{{ t('admin.audit.description') }}</p>
    </div>
    <span class="moderation-total">{{
      t('admin.audit.total', { count: total.toLocaleString(intlLocale()) })
    }}</span>
  </div>
  <section class="surface-card words-card">
    <form class="words-form" @submit.prevent="load()">
      <label class="moderation-control"
        ><span>{{ t('admin.audit.adminId') }}</span
        ><input v-model="filters.adminId" type="text" inputmode="numeric"
      /></label>
      <label class="moderation-control"
        ><span>{{ t('admin.audit.action') }}</span
        ><input
          v-model="filters.action"
          maxlength="60"
          :placeholder="t('admin.audit.actionPlaceholder')"
      /></label>
      <label class="moderation-control"
        ><span>{{ t('admin.audit.from') }}</span
        ><input v-model="filters.from" type="date"
      /></label>
      <label class="moderation-control"
        ><span>{{ t('admin.audit.to') }}</span
        ><input v-model="filters.to" type="date"
      /></label>
      <button class="button" type="submit">{{ t('admin.audit.apply') }}</button>
    </form>
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="!items.length && !loading" class="reports-empty">{{ t('admin.audit.empty') }}</p>
    <div v-else class="audit-table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th>{{ t('admin.audit.col.time') }}</th>
            <th>{{ t('admin.audit.col.admin') }}</th>
            <th>{{ t('admin.audit.action') }}</th>
            <th>{{ t('admin.audit.col.target') }}</th>
            <th>{{ t('admin.audit.col.detail') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in items" :key="l.id">
            <td>{{ when(l.createdAt) }}</td>
            <td>@{{ l.admin.username }}</td>
            <td>{{ l.action }}</td>
            <td>
              {{ l.targetType ?? '—' }}<template v-if="l.targetId"> #{{ l.targetId }}</template>
            </td>
            <td>
              <code>{{ l.detail ? JSON.stringify(l.detail) : '' }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button v-if="nextCursor" class="button button--quiet" :disabled="loading" @click="load(true)">
      {{ t('admin.common.loadMore') }}
    </button>
  </section>
</template>
