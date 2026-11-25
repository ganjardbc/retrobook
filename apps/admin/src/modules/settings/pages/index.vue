<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminSettingsApi, type SystemSettings } from '@/modules/settings/services/api'

const settings = ref<SystemSettings | null>(null)
const error = ref('')
const notice = ref('')
const busy = ref(false)
async function load() {
  try { settings.value = await adminSettingsApi.get() } catch (e) { error.value = e instanceof Error ? e.message : 'Gagal memuat pengaturan.' }
}
async function change(changes: Partial<SystemSettings>) {
  busy.value = true; error.value = ''; notice.value = ''
  try { settings.value = await adminSettingsApi.update(changes); notice.value = 'Pengaturan disimpan dan langsung berlaku.' }
  catch (e) { error.value = e instanceof Error ? e.message : 'Gagal menyimpan pengaturan.' }
  finally { busy.value = false }
}
function toggleMaintenance() {
  if (!settings.value) return
  const next = !settings.value.maintenanceMode
  if (next && !window.confirm('Aktifkan maintenance? Semua non-admin akan melihat halaman pemeliharaan.')) return
  void change({ maintenanceMode: next })
}
onMounted(load)
</script>

<template>
  <div class="page-heading"><div><p class="eyebrow">SISTEM</p><h1>Pengaturan</h1><p class="page-description">Perubahan berlaku langsung tanpa deploy ulang dan tercatat di audit log.</p></div></div>
  <section class="surface-card words-card">
    <p v-if="error" class="user-error" role="alert">{{ error }}</p><p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <template v-if="settings">
      <div class="setting-row"><div><strong>Maintenance mode</strong><p class="report-meta">Hanya admin yang bisa masuk; pengguna lain melihat halaman pemeliharaan.</p></div><button class="button" :class="settings.maintenanceMode ? 'button--danger' : 'button--quiet'" :disabled="busy" role="switch" :aria-checked="settings.maintenanceMode" @click="toggleMaintenance">{{ settings.maintenanceMode ? 'Aktif — matikan' : 'Mati — aktifkan' }}</button></div>
      <div class="setting-row"><div><strong>Pendaftaran</strong><p class="report-meta">Bila ditutup, register baru ditolak.</p></div><button class="button button--quiet" :disabled="busy" role="switch" :aria-checked="settings.registrationOpen" @click="change({ registrationOpen: !settings.registrationOpen })">{{ settings.registrationOpen ? 'Terbuka — tutup' : 'Ditutup — buka' }}</button></div>
    </template>
  </section>
</template>
