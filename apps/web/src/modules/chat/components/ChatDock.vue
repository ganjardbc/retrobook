<script setup lang="ts">
import ChatWindow from '@/modules/chat/components/ChatWindow.vue'
import { useChatStore } from '@/modules/chat/stores'

const chat = useChatStore()
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
  /* Layar sempit: hanya satu jendela yang muat. */
  .dock {
    left: var(--sp-2);
    flex-direction: column-reverse;
  }
  .dock > :deep(.win) {
    width: auto;
  }
}
</style>
