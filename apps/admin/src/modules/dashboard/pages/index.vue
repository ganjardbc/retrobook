<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import DailyBarChart from '@/modules/dashboard/components/DailyBarChart.vue'
import { useDashboardStore } from '@/modules/dashboard/stores'

const dashboard = useDashboardStore()
const stats = computed(() => dashboard.stats)
const number = (value?: number) => new Intl.NumberFormat('id-ID').format(value ?? 0)
const cards = computed(() => [
  {
    label: 'Total pengguna',
    value: stats.value?.totalUsers,
    icon: '♙',
    tone: 'blue',
    note: 'Akun terdaftar',
  },
  {
    label: 'Total post',
    value: stats.value?.totalPosts,
    icon: '▤',
    tone: 'violet',
    note: 'Konten komunitas',
  },
  {
    label: 'Total komentar',
    value: stats.value?.totalComments,
    icon: '▱',
    tone: 'teal',
    note: 'Percakapan',
  },
  {
    label: 'Aktif hari ini',
    value: stats.value?.activeUsersToday,
    icon: '◉',
    tone: 'green',
    note: 'Pengguna aktif',
  },
  {
    label: 'Pendaftar baru',
    value: stats.value?.newUsersLast7Days,
    icon: '↗',
    tone: 'amber',
    note: '7 hari terakhir',
  },
  {
    label: 'Laporan pending',
    value: stats.value?.pendingReports,
    icon: '⚑',
    tone: 'rose',
    note: 'Menunggu tinjauan',
  },
])

onMounted(() => {
  void dashboard.fetchStats()
})
</script>

<template>
  <div class="page-heading dashboard-heading">
    <div>
      <p class="eyebrow">PUSAT KENDALI</p>
      <h1>Ringkasan</h1>
      <p class="page-description">Pantau kondisi komunitas Retrobook dari satu tempat.</p>
    </div>
    <button class="date-pill" :disabled="dashboard.loading" @click="dashboard.fetchStats()">
      <span>◷</span> 7 hari terakhir
      <span class="refresh-icon" :class="{ 'refresh-icon--spin': dashboard.loading }">↻</span>
    </button>
  </div>

  <div v-if="dashboard.error" class="dashboard-error" role="alert">
    <span class="error-mark">!</span>
    <div>
      <strong>Statistik belum dapat dimuat</strong>
      <p>{{ dashboard.error }}</p>
    </div>
    <button @click="dashboard.fetchStats()">Coba lagi <span>↻</span></button>
  </div>

  <section class="stat-grid" aria-label="Statistik komunitas">
    <article
      v-for="card in cards"
      :key="card.label"
      class="stat-card"
      :class="{ 'stat-card--loading': dashboard.loading && !stats }"
    >
      <div class="stat-card__top">
        <span class="stat-label">{{ card.label }}</span
        ><span class="stat-icon" :class="`stat-icon--${card.tone}`">{{ card.icon }}</span>
      </div>
      <strong class="stat-value">{{ !stats ? '—' : number(card.value) }}</strong>
      <span class="stat-note">{{ card.note }}</span>
    </article>
  </section>

  <section class="chart-section">
    <div class="chart-section__heading">
      <div>
        <p class="eyebrow">AKTIVITAS KOMUNITAS</p>
        <h2>Tren 7 hari</h2>
      </div>
      <span class="chart-period"><i /> Diperbarui saat dibuka</span>
    </div>
    <div class="charts-grid">
      <article class="chart-card">
        <div class="chart-card__heading">
          <div>
            <h3>Pendaftaran pengguna</h3>
            <p>Pengguna baru per hari</p>
          </div>
          <span class="chart-indicator chart-indicator--blue" aria-hidden="true" />
        </div>
        <DailyBarChart
          :items="stats?.registrationsByDay ?? []"
          label="Pendaftaran pengguna per hari"
          :loading="dashboard.loading && !stats"
        />
      </article>
      <article class="chart-card">
        <div class="chart-card__heading">
          <div>
            <h3>Post dibuat</h3>
            <p>Post baru per hari</p>
          </div>
          <span class="chart-indicator chart-indicator--green" aria-hidden="true" />
        </div>
        <DailyBarChart
          :items="stats?.postsByDay ?? []"
          label="Post baru per hari"
          :loading="dashboard.loading && !stats"
        />
      </article>
    </div>
  </section>

  <section class="section-heading">
    <div>
      <p class="eyebrow">NAVIGASI CEPAT</p>
      <h2>Mulai dari sini</h2>
    </div>
  </section>
  <div class="quick-grid">
    <RouterLink to="/users" class="quick-card"
      ><span class="quick-icon quick-icon--blue">♙</span>
      <div>
        <strong>Kelola pengguna</strong>
        <p>Cari dan tinjau akun komunitas</p>
      </div>
      <span class="quick-arrow">↗</span></RouterLink
    >
    <RouterLink class="quick-card" to="/moderation"
      ><span class="quick-icon quick-icon--amber">▤</span>
      <div>
        <strong>Moderasi konten</strong>
        <p>Tinjau post dan komentar</p>
      </div>
      <span class="quick-arrow">→</span></RouterLink
    >
    <div class="quick-card quick-card--disabled">
      <span class="quick-icon quick-icon--rose">⚑</span>
      <div>
        <strong>Antrean laporan</strong>
        <p>Segera tersedia</p>
      </div>
      <span class="soon-pill">SEGERA</span>
    </div>
  </div>
</template>
