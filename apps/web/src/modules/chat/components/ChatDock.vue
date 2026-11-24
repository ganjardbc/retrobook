<script setup lang="ts">
import ChatWindow from '@/modules/chat/components/ChatWindow.vue'
import { useChatStore } from '@/modules/chat/stores'

const chat = useChatStore()
</script>

<template>
  <!-- Jendela di dasar layar, di kiri kolom chat; maksimal tiga (CHT-03). -->
  <div v-if="chat.windows.length" class="dock">
    <ChatWindow v-for="w in chat.windows" :key="w.user.id" :win="w" />
  </div>
</template>

<style scoped>
.dock {
  position: fixed;
  bottom: 0;
  /* Rata dengan tepi kiri kolom kanan: separuh sisa lebar layar ditambah lebar kolom kanan. */
  right: calc(
    max(0px, (100vw - (var(--w-left) + var(--w-feed) + var(--w-right) + 2 * var(--sp-3))) / 2) +
      var(--w-right) + var(--sp-3)
  );
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
