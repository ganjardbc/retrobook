<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isUuid } from '@retrobook/shared'
import { useRoute, useRouter } from 'vue-router'
import { AdminApiError } from '@/modules/auth/services/api'
import { adminUsersApi } from '@/modules/user/services/api'
import { useUserStore } from '@/modules/user/stores'
import type { UserRole, UserStatus } from '@/modules/user/services/types'

const route = useRoute()
const router = useRouter()
const users = useUserStore()
const id = String(route.params.id)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const temporaryPassword = ref('')
const user = computed(() => users.currentUser)
onMounted(() => {
  if (isUuid(id)) void users.fetchDetail(id)
  else void router.replace('/users')
})
function friendly(errorValue: unknown) {
  if (errorValue instanceof AdminApiError)
    return /LAST_ADMIN|admin terakhir/i.test(errorValue.message)
      ? 'Aksi ditolak: harus ada setidaknya satu admin aktif.'
      : errorValue.message
  return 'Aksi gagal. Silakan coba lagi.'
}
async function changeStatus(status: UserStatus) {
  if (!user.value || busy.value) return
  const reason = window
    .prompt(
      `Alasan ${status === 'ACTIVE' ? 'mengaktifkan kembali' : status === 'SUSPENDED' ? 'menangguhkan' : 'memblokir'} akun ini:`,
    )
    ?.trim()
  if (!reason) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await adminUsersApi.updateStatus(id, status, reason)
    notice.value = 'Status pengguna berhasil diperbarui.'
    await users.fetchDetail(id)
  } catch (e) {
    error.value = friendly(e)
  } finally {
    busy.value = false
  }
}
async function changeRole(event: Event) {
  if (!user.value || busy.value) return
  const role = (event.target as HTMLSelectElement).value as UserRole
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await adminUsersApi.updateRole(id, role)
    notice.value = 'Role pengguna berhasil diperbarui.'
    await users.fetchDetail(id)
  } catch (e) {
    error.value = friendly(e)
    await users.fetchDetail(id)
  } finally {
    busy.value = false
  }
}
async function resetPassword() {
  if (
    !user.value ||
    busy.value ||
    !window.confirm(
      `Buat password sementara untuk @${user.value.username}? Semua sesi aktif akan dicabut.`,
    )
  )
    return
  busy.value = true
  error.value = ''
  temporaryPassword.value = ''
  notice.value = ''
  try {
    const result = await adminUsersApi.resetPassword(id)
    temporaryPassword.value = result.temporaryPassword
    notice.value = `${result.revokedSessions} sesi dicabut. Salin password sementara sekarang.`
  } catch (e) {
    error.value = friendly(e)
  } finally {
    busy.value = false
  }
}
async function removeUser() {
  if (
    !user.value ||
    busy.value ||
    !window.confirm(`Hapus akun @${user.value.username}? Akun akan dinonaktifkan dan sesi dicabut.`)
  )
    return
  const typed = window.prompt(
    `Ketik username “${user.value.username}” untuk mengonfirmasi penghapusan:`,
  )
  if (typed !== user.value.username) {
    if (typed !== null) error.value = 'Username tidak cocok; akun tidak dihapus.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await adminUsersApi.remove(id)
    await router.push('/users')
  } catch (e) {
    error.value = friendly(e)
  } finally {
    busy.value = false
  }
}
async function copyPassword() {
  await navigator.clipboard.writeText(temporaryPassword.value)
  notice.value = 'Password sementara disalin.'
}
function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Belum pernah aktif'
}
</script>

<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">DIREKTORI KOMUNITAS</p>
      <h1>Detail pengguna</h1>
      <p class="page-description">Informasi akun dan tindakan administrasi.</p>
    </div>
    <button class="button button--quiet" @click="router.push('/users')">
      ← Kembali ke pengguna
    </button>
  </div>
  <div v-if="users.detailLoading" class="surface-card detail-loading">
    <span class="loader" /> Memuat detail pengguna…
  </div>
  <div v-else-if="users.detailError" class="surface-card detail-loading">
    <p class="form-error">{{ users.detailError }}</p>
    <button class="button button--quiet" @click="users.fetchDetail(id)">Coba lagi</button>
  </div>
  <template v-else-if="user">
    <p v-if="error" class="user-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <section class="surface-card user-profile-card">
      <div class="detail-identity">
        <span class="detail-avatar">{{ user.displayName.slice(0, 1).toUpperCase() }}</span>
        <div>
          <p class="eyebrow">PROFIL AKUN</p>
          <h2>{{ user.displayName }} <span v-if="user.isBot" class="bot-tag">BOT</span></h2>
          <p>@{{ user.username }} · {{ user.email }}</p>
        </div>
      </div>
      <div class="detail-badges">
        <span class="user-pill" :class="`user-pill--${user.role.toLowerCase()}`">{{
          user.role === 'ADMIN' ? 'Admin' : 'Pengguna'
        }}</span><span class="user-status" :class="`user-status--${user.status.toLowerCase()}`"
          ><i />{{
            user.status === 'ACTIVE'
              ? 'Aktif'
              : user.status === 'SUSPENDED'
                ? 'Ditangguhkan'
                : 'Diblokir'
          }}</span
        >
      </div>
    </section>
    <section class="detail-grid">
      <article class="surface-card detail-card">
        <p class="eyebrow">AKTIVITAS</p>
        <h2>Ringkasan akun</h2>
        <dl class="detail-stats">
          <div>
            <dt>Postingan</dt>
            <dd>{{ user.postCount }}</dd>
          </div>
          <div>
            <dt>Komentar</dt>
            <dd>{{ user.commentCount }}</dd>
          </div>
          <div>
            <dt>Laporan diterima</dt>
            <dd>{{ user.reportCount }}</dd>
          </div>
        </dl>
        <dl class="detail-meta">
          <div>
            <dt>Email</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div>
            <dt>Bergabung</dt>
            <dd>{{ date(user.createdAt) }}</dd>
          </div>
          <div>
            <dt>Aktif terakhir</dt>
            <dd>{{ date(user.lastSeenAt) }}</dd>
          </div>
        </dl>
      </article>
      <article class="surface-card detail-card">
        <p class="eyebrow">KELOLA AKUN</p>
        <h2>Tindakan admin</h2>
        <label class="detail-label"
          >Role pengguna<select :value="user.role" :disabled="busy" @change="changeRole">
            <option value="USER">Pengguna</option>
            <option value="ADMIN">Admin</option>
          </select></label
        >
        <div class="action-stack">
          <button
            class="button button--quiet"
            :disabled="busy"
            @click="changeStatus(user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')"
          >
            {{ user.status === 'ACTIVE' ? 'Tangguhkan akun' : 'Aktifkan akun' }}</button><button
            v-if="user.status !== 'BANNED'"
            class="button button--warning"
            :disabled="busy"
            @click="changeStatus('BANNED')"
          >
            Blokir akun</button
          ><button class="button button--quiet" :disabled="busy" @click="resetPassword">
            Reset password</button
          ><button class="button button--danger" :disabled="busy" @click="removeUser">
            Hapus akun
          </button>
        </div>
      </article>
    </section>
    <section v-if="temporaryPassword" class="surface-card password-reveal">
      <div>
        <p class="eyebrow">PASSWORD SEMENTARA</p>
        <strong>{{ temporaryPassword }}</strong>
        <p>Simpan password ini sekarang. Nilai ini hanya ditampilkan sekali.</p>
      </div>
      <button class="button button--primary" @click="copyPassword">Salin password</button>
    </section>
  </template>
</template>
