<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { intlLocale, t } from '@retrobook/shared/i18n'
import { RouterLink } from 'vue-router'
import DailyBarChart from '@/modules/dashboard/components/DailyBarChart.vue'
import { useDashboardStore } from '@/modules/dashboard/stores'

const dashboard = useDashboardStore()
const stats = computed(() => dashboard.stats)
const number = (value?: number) => new Intl.NumberFormat(intlLocale()).format(value ?? 0)
const cards = computed(() => [
  {
    label: t('admin.dashboard.card.users'),
    value: stats.value?.totalUsers,
    icon: '♙',
    tone: 'blue',
    note: t('admin.dashboard.card.users.note'),
  },
  {
    label: t('admin.dashboard.card.posts'),
    value: stats.value?.totalPosts,
    icon: '▤',
    tone: 'violet',
    note: t('admin.dashboard.card.posts.note'),
  },
  {
    label: t('admin.dashboard.card.comments'),
    value: stats.value?.totalComments,
    icon: '▱',
    tone: 'teal',
    note: t('admin.dashboard.card.comments.note'),
  },
  {
    label: t('admin.dashboard.card.active'),
    value: stats.value?.activeUsersToday,
    icon: '◉',
    tone: 'green',
    note: t('admin.dashboard.card.active.note'),
  },
  {
    label: t('admin.dashboard.card.new'),
    value: stats.value?.newUsersLast7Days,
    icon: '↗',
    tone: 'amber',
    note: t('admin.dashboard.card.new.note'),
  },
  {
    label: t('admin.dashboard.card.reports'),
    value: stats.value?.pendingReports,
    icon: '⚑',
    tone: 'rose',
    note: t('admin.dashboard.card.reports.note'),
  },
])

onMounted(() => {
  void dashboard.fetchStats()
})
</script>

<template>
  <div class="page-heading dashboard-heading">
    <div>
      <p class="eyebrow">{{ t('admin.dashboard.eyebrow') }}</p>
      <h1>{{ t('admin.nav.overview') }}</h1>
      <p class="page-description">{{ t('admin.dashboard.description') }}</p>
    </div>
    <button class="date-pill" :disabled="dashboard.loading" @click="dashboard.fetchStats()">
      <span>◷</span> {{ t('admin.dashboard.last7') }}
      <span class="refresh-icon" :class="{ 'refresh-icon--spin': dashboard.loading }">↻</span>
    </button>
  </div>

  <div v-if="dashboard.error" class="dashboard-error" role="alert">
    <span class="error-mark">!</span>
    <div>
      <strong>{{ t('admin.dashboard.errorTitle') }}</strong>
      <p>{{ dashboard.error }}</p>
    </div>
    <button @click="dashboard.fetchStats()">{{ t('admin.common.retry') }} <span>↻</span></button>
  </div>

  <section class="stat-grid" :aria-label="t('admin.dashboard.statsLabel')">
    <article
      v-for="card in cards"
      :key="card.label"
      class="stat-card"
      :class="{ 'stat-card--loading': dashboard.loading && !stats }"
    >
      <div class="stat-card__top">
        <span class="stat-label">{{ card.label }}</span><span
          class="stat-icon"
          :class="`stat-icon--${card.tone}`"
          >{{ card.icon }}</span
        >
      </div>
      <strong class="stat-value">{{ !stats ? '—' : number(card.value) }}</strong>
      <span class="stat-note">{{ card.note }}</span>
    </article>
  </section>

  <section class="chart-section">
    <div class="chart-section__heading">
      <div>
        <p class="eyebrow">{{ t('admin.dashboard.activity') }}</p>
        <h2>{{ t('admin.dashboard.trend') }}</h2>
      </div>
      <span class="chart-period"><i /> {{ t('admin.dashboard.updatedOnOpen') }}</span>
    </div>
    <div class="charts-grid">
      <article class="chart-card">
        <div class="chart-card__heading">
          <div>
            <h3>{{ t('admin.dashboard.chart.reg') }}</h3>
            <p>{{ t('admin.dashboard.chart.reg.note') }}</p>
          </div>
          <span class="chart-indicator chart-indicator--blue" aria-hidden="true" />
        </div>
        <DailyBarChart
          :items="stats?.registrationsByDay ?? []"
          :label="t('admin.dashboard.chart.reg.label')"
          :loading="dashboard.loading && !stats"
        />
      </article>
      <article class="chart-card">
        <div class="chart-card__heading">
          <div>
            <h3>{{ t('admin.dashboard.chart.posts') }}</h3>
            <p>{{ t('admin.dashboard.chart.posts.note') }}</p>
          </div>
          <span class="chart-indicator chart-indicator--green" aria-hidden="true" />
        </div>
        <DailyBarChart
          :items="stats?.postsByDay ?? []"
          :label="t('admin.dashboard.chart.posts.label')"
          :loading="dashboard.loading && !stats"
        />
      </article>
    </div>
  </section>

  <section class="section-heading">
    <div>
      <p class="eyebrow">{{ t('admin.dashboard.quick') }}</p>
      <h2>{{ t('admin.dashboard.quick.title') }}</h2>
    </div>
  </section>
  <div class="quick-grid">
    <RouterLink to="/users" class="quick-card"
      ><span class="quick-icon quick-icon--blue">♙</span>
      <div>
        <strong>{{ t('admin.dashboard.quick.users') }}</strong>
        <p>{{ t('admin.dashboard.quick.users.note') }}</p>
      </div>
      <span class="quick-arrow">↗</span></RouterLink
    >
    <RouterLink class="quick-card" to="/moderation"
      ><span class="quick-icon quick-icon--amber">▤</span>
      <div>
        <strong>{{ t('admin.moderation.title') }}</strong>
        <p>{{ t('admin.dashboard.quick.moderation.note') }}</p>
      </div>
      <span class="quick-arrow">→</span></RouterLink
    >
    <div class="quick-card quick-card--disabled">
      <span class="quick-icon quick-icon--rose">⚑</span>
      <div>
        <strong>{{ t('admin.reports.title') }}</strong>
        <p>{{ t('admin.dashboard.quick.soon') }}</p>
      </div>
      <span class="soon-pill">{{ t('admin.dashboard.soon') }}</span>
    </div>
  </div>
</template>
