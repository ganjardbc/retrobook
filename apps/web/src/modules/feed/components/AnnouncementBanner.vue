<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { request } from '@/plugins/http'

type Announcement = { id: string; title: string; body: string }
const items = ref<Announcement[]>([])
const dismissed = ref<string[]>([])

// Banner bersifat tambahan: gagal memuat tidak boleh mengganggu feed.
onMounted(async () => {
  try {
    items.value = (await request<{ items: Announcement[] }>('/announcements/active')).items
  } catch {
    items.value = []
  }
})
</script>

<template>
  <div
    v-for="a in items.filter((i) => !dismissed.includes(i.id))"
    :key="a.id"
    class="banner"
    role="status"
  >
    <div>
      <strong>{{ a.title }}</strong>
      <p>{{ a.body }}</p>
    </div>
    <button class="banner__close" type="button" aria-label="Dismiss" @click="dismissed.push(a.id)">
      ×
    </button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-highlight);
  border: var(--card-border);
  border-radius: var(--radius);
}
.banner p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.banner__close {
  align-self: flex-start;
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
}
</style>
