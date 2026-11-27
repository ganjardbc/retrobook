<script setup lang="ts">
import { inject, watch } from 'vue'
import { routeLocationKey } from 'vue-router'
import { useMobile } from '@/composables/mobile'
import ChatWindow from '@/modules/chat/components/ChatWindow.vue'
import { useChatStore } from '@/modules/chat/stores'

const chat = useChatStore()
// Tanpa router terpasang (tes komponen) tidak ada perpindahan halaman yang perlu diikuti.
const route = inject(routeLocationKey, null)
const mobile = useMobile()
// Ponsel: lembar chat menutupi halaman, jadi saat pindah halaman diciutkan menjadi bilah di dasar layar.
watch(
  () => route?.fullPath,
  () => {
    if (mobile.value) chat.windows.forEach((w) => (w.minimized = true))
  },
)
</script>

<template>
  <!-- Jendela di dasar layar, di kiri strip chat; maksimal tiga (CHT-03). -->
  <div v-if="chat.windows.length" class="dock">
    <ChatWindow v-for="w in chat.windows" :key="w.user.id" :win="w" />
  </div>
</template>

<style scoped>
.dock {
  position: fixed;
  bottom: 0;
  /* Di kiri strip chat yang menempel di tepi kanan. */
  right: calc(var(--w-chat) + var(--sp-2));
  z-index: 15;
  display: flex;
  flex-direction: row-reverse;
  gap: var(--sp-2);
  align-items: flex-end;
}
@media (max-width: 900px) {
  /* Kolom kanan tersembunyi: dock menempel ke tepi layar. */
  .dock {
    right: var(--sp-2);
  }
}
@media (max-width: 640px) {
  /* Ponsel: jendela terbaru menjadi lembar selebar layar di bawah navbar (seperti aplikasi chat);
     jendela lain tetap terbuka di belakang dan tidak ditampilkan. Diciutkan: tinggal bilah judul. */
  .dock {
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }
  .dock > :deep(.win) {
    width: auto;
    height: calc(100vh - var(--h-navbar));
    height: calc(100dvh - var(--h-navbar));
    border-right: 0;
    border-left: 0;
  }
  .dock > :deep(.win--min) {
    height: auto;
  }
  .dock > :deep(.win:not(:last-child)) {
    display: none;
  }
}
</style>
