<script setup lang="ts">
import { computed } from 'vue'
import { intlLocale, t } from '@retrobook/shared/i18n'
import type { DailyCount } from '@/modules/dashboard/services/types'

const props = defineProps<{ items: DailyCount[]; label: string; loading?: boolean }>()
const maxValue = computed(() => Math.max(1, ...props.items.map((item) => item.count)))
const bars = computed(() => {
  const cellWidth = props.items.length ? 680 / props.items.length : 0
  const width = Math.min(26, cellWidth * 0.48)
  return props.items.map((item, index) => {
    const height = item.count === 0 ? 2 : Math.max(4, (item.count / maxValue.value) * 134)
    return {
      ...item,
      x: 58 + index * cellWidth + (cellWidth - width) / 2,
      y: 165 - height,
      width,
      height,
      day: new Intl.DateTimeFormat(intlLocale(), { weekday: 'short' }).format(
        new Date(`${item.date}T12:00:00`),
      ),
      title: `${item.count} ${props.label.toLowerCase()} · ${new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'medium' }).format(new Date(`${item.date}T12:00:00`))}`,
    }
  })
})
const ticks = computed(() => [maxValue.value, Math.round(maxValue.value / 2), 0])
</script>

<template>
  <div v-if="loading" class="chart-loading">
    <span class="loader" /><span>{{ t('admin.chart.loading') }}</span>
  </div>
  <div v-else-if="!items.length" class="chart-empty">{{ t('admin.chart.empty') }}</div>
  <svg v-else class="daily-chart" viewBox="0 0 760 215" role="img" :aria-label="label">
    <g v-for="(tick, index) in ticks" :key="`tick-${index}`">
      <text x="40" :y="25 + index * 70" text-anchor="end">{{ tick }}</text>
      <line x1="51" :y1="21 + index * 70" x2="748" :y2="21 + index * 70" />
    </g>
    <g v-for="bar in bars" :key="bar.date">
      <rect :x="bar.x" :y="bar.y" :width="bar.width" :height="bar.height" rx="4" />
      <text :x="bar.x + bar.width / 2" y="198" text-anchor="middle">{{ bar.day }}</text>
      <title>{{ bar.title }}</title>
    </g>
  </svg>
</template>
