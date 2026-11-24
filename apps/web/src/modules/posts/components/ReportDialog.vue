<script setup lang="ts">
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'
import { onMounted, ref } from 'vue'
import Button from '@/components/Button.vue'
import { ApiRequestError } from '@/plugins/http'
import { reportsApi } from '@/modules/posts/services/reports'

// INT-04: dialog Report untuk post, komentar, dan profil; alasan wajib dipilih, catatan opsional.
const props = defineProps<{ targetType: ReportTargetType; targetId: number }>()
const emit = defineEmits<{ close: [] }>()

const reason = ref<ReportReason | null>(null)
const note = ref('')
const sending = ref(false)
/** Hasil akhir: pesan yang ditampilkan menggantikan formulir. */
const outcome = ref<'sent' | 'already' | 'gone' | null>(null)
const error = ref(false)
const first = ref<HTMLInputElement[] | null>(null)

onMounted(() => first.value?.[0]?.focus())

async function submit() {
  if (!reason.value || sending.value) return
  sending.value = true
  error.value = false
  try {
    await reportsApi.create({
      targetType: props.targetType,
      targetId: props.targetId,
      reason: reason.value,
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    })
    outcome.value = 'sent'
  } catch (e) {
    if (e instanceof ApiRequestError && e.code === 'ALREADY_REPORTED') outcome.value = 'already'
    else if (e instanceof ApiRequestError && e.status === 404) outcome.value = 'gone'
    else error.value = true
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="report__backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
      <div class="report" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <h2 id="report-title" class="report__title">{{ t(`report.title.${targetType}`) }}</h2>

        <template v-if="outcome">
          <p class="report__msg" role="status">
            {{
              outcome === 'sent'
                ? t('report.sent')
                : outcome === 'already'
                  ? t('report.already')
                  : t('report.gone')
            }}
          </p>
          <div class="report__actions">
            <Button @click="emit('close')">{{ t('report.close') }}</Button>
          </div>
        </template>

        <form v-else @submit.prevent="submit">
          <fieldset class="report__reasons">
            <legend>{{ t('report.reason') }}</legend>
            <label v-for="r in REPORT_REASONS" :key="r" class="report__reason">
              <input ref="first" v-model="reason" type="radio" name="report-reason" :value="r" />
              {{ t(`report.reason.${r}`) }}
            </label>
          </fieldset>
          <textarea
            v-model="note"
            class="report__note"
            rows="3"
            maxlength="500"
            :aria-label="t('report.note')"
            :placeholder="t('report.note')"
          />
          <p v-if="error" class="form-error" role="alert">{{ t('report.error') }}</p>
          <div class="report__actions">
            <Button variant="default" @click="emit('close')">{{ t('report.cancel') }}</Button>
            <Button type="submit" :disabled="!reason || sending">{{ t('report.submit') }}</Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.report__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-3);
  background: rgb(0 0 0 / 0.5);
}
.report {
  width: min(420px, 100%);
  background: var(--c-card);
  border: var(--card-border);
  border-radius: var(--radius);
}
.report__title {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-card-subtle);
  border-bottom: 1px solid var(--c-border-soft);
  font-size: var(--fs-base);
}
.report form,
.report__msg {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: var(--sp-3);
}
.report__reasons {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  margin: 0;
  padding: 0;
  border: 0;
}
.report__reasons legend {
  padding: 0;
  margin-bottom: var(--sp-1);
  font-weight: bold;
}
.report__reason {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.report__note {
  padding: var(--sp-2);
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius);
  font: inherit;
  resize: vertical;
}
.report__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: 0 var(--sp-3) var(--sp-3);
}
.report form .report__actions {
  padding: 0;
}
</style>
