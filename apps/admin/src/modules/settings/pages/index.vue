<script setup lang="ts">
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import { adminSettingsApi, type SystemSettings } from '@/modules/settings/services/api'

const settings = ref<SystemSettings | null>(null)
const error = ref('')
const notice = ref('')
const busy = ref(false)
async function load() {
  try {
    settings.value = await adminSettingsApi.get()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.settings.loadError')
  }
}
async function change(changes: Partial<SystemSettings>) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    settings.value = await adminSettingsApi.update(changes)
    notice.value = t('admin.settings.saved')
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('admin.settings.saveError')
  } finally {
    busy.value = false
  }
}
function toggleMaintenance() {
  if (!settings.value) return
  const next = !settings.value.maintenanceMode
  if (next && !window.confirm(t('admin.settings.maintenance.confirm'))) return
  void change({ maintenanceMode: next })
}
onMounted(load)
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin.nav.group.system') }}</p>
      <h1>{{ t('admin.nav.settings') }}</h1>
      <p class="page-description">{{ t('admin.settings.description') }}</p>
    </div>
  </div>
  <section class="surface-card words-card">
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <template v-if="settings">
      <div class="setting-row">
        <div>
          <strong>{{ t('admin.settings.maintenance') }}</strong>
          <p class="report-meta">{{ t('admin.settings.maintenance.note') }}</p>
        </div>
        <button
          class="button"
          :class="settings.maintenanceMode ? 'button--danger' : 'button--quiet'"
          :disabled="busy"
          role="switch"
          :aria-checked="settings.maintenanceMode"
          @click="toggleMaintenance"
        >
          {{
            settings.maintenanceMode
              ? t('admin.settings.maintenance.on')
              : t('admin.settings.maintenance.off')
          }}
        </button>
      </div>
      <div class="setting-row">
        <div>
          <strong>{{ t('admin.settings.registration') }}</strong>
          <p class="report-meta">{{ t('admin.settings.registration.note') }}</p>
        </div>
        <button
          class="button button--quiet"
          :disabled="busy"
          role="switch"
          :aria-checked="settings.registrationOpen"
          @click="change({ registrationOpen: !settings.registrationOpen })"
        >
          {{
            settings.registrationOpen
              ? t('admin.settings.registration.on')
              : t('admin.settings.registration.off')
          }}
        </button>
      </div>
    </template>
  </section>
</template>
