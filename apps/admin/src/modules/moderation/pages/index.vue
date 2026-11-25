<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminDataTable, { type TableColumn } from '@/components/AdminDataTable.vue'
import { useModerationStore } from '@/modules/moderation/stores'
import type {
  ModerationComment,
  ModerationItem,
  ModerationResource,
} from '@/modules/moderation/services/types'

const moderation = useModerationStore()
const selected = ref<number[]>([])
const actionError = ref('')
const notice = ref('')
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout>
const columns: TableColumn<Record<string, unknown>>[] = [
  { key: 'selection', label: '', width: '42px' },
  { key: 'content', label: 'KONTEN' },
  { key: 'author', label: 'PENULIS', width: '150px' },
  { key: 'createdAt', label: 'TANGGAL', width: '140px' },
  { key: 'reports', label: 'LAPORAN', width: '100px' },
  { key: 'state', label: 'STATUS', width: '118px' },
]
const rows = computed(() => moderation.items as unknown as Record<string, unknown>[])
onMounted(() => void moderation.fetch())
watch(
  () => moderation.resource,
  () => {
    selected.value = []
    moderation.resetPagination()
    void moderation.fetch()
  },
)
watch([() => moderation.filter, () => moderation.from, () => moderation.to], () => {
  selected.value = []
  moderation.resetPagination()
  void moderation.fetch()
})
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    moderation.q = value
    selected.value = []
    moderation.resetPagination()
    void moderation.fetch()
  }, 250)
})
function setResource(value: ModerationResource) {
  moderation.resource = value
}
function item(row: Record<string, unknown>) {
  return row as unknown as ModerationItem
}
function comment(value: ModerationItem): value is ModerationComment {
  return 'post' in value
}
function toggle(id: number) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((value) => value !== id)
    : [...selected.value, id]
}
function date(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
function context(value: ModerationItem) {
  return comment(value)
    ? `Pada post oleh ${value.post.author.displayName}: ${value.post.content || '〔gambar〕'}`
    : value.imageUrl
      ? 'Post ini menyertakan gambar'
      : ''
}
async function setHidden(row: Record<string, unknown>, hidden: boolean) {
  actionError.value = ''
  notice.value = ''
  try {
    await moderation.setHidden(Number(row.id), hidden)
    selected.value = []
    notice.value = hidden ? 'Konten disembunyikan.' : 'Konten ditampilkan kembali.'
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Aksi moderasi gagal.'
  }
}
async function remove(row: Record<string, unknown>) {
  const content = item(row)
  if (
    !window.confirm(
      `Hapus ${moderation.resource === 'posts' ? 'post' : 'komentar'} dari @${content.author.username}? Konten akan dihapus secara lunak.`,
    )
  )
    return
  actionError.value = ''
  notice.value = ''
  try {
    await moderation.remove(content.id)
    selected.value = []
    notice.value = 'Konten dihapus.'
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Penghapusan gagal.'
  }
}
async function bulk(action: 'hide' | 'show' | 'delete') {
  if (!selected.value.length) return
  const actionName =
    action === 'hide' ? 'sembunyikan' : action === 'show' ? 'tampilkan kembali' : 'hapus'
  if (
    !window.confirm(
      `${actionName[0]?.toUpperCase()}${actionName.slice(1)} ${selected.value.length} konten terpilih?`,
    )
  )
    return
  const reason = window.prompt('Alasan moderasi (opsional):')?.trim() || undefined
  actionError.value = ''
  notice.value = ''
  try {
    const count = selected.value.length
    await moderation.bulk([...selected.value], action, reason)
    selected.value = []
    notice.value = `${count} konten berhasil diproses.`
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Aksi massal gagal.'
  }
}
</script>

<template>
  <div class="page-heading moderation-heading">
    <div>
      <p class="eyebrow">KEAMANAN KOMUNITAS</p>
      <h1>Moderasi konten</h1>
      <p class="page-description">Tinjau post dan komentar yang perlu perhatian moderator.</p>
    </div>
    <span class="moderation-total">{{ moderation.total.toLocaleString('id-ID') }} item</span>
  </div>
  <section class="surface-card moderation-card">
    <div class="moderation-tabs" role="tablist" aria-label="Jenis konten">
      <button
        role="tab"
        :aria-selected="moderation.resource === 'posts'"
        :class="{ 'moderation-tab--active': moderation.resource === 'posts' }"
        @click="setResource('posts')"
      >
        Post</button
      ><button
        role="tab"
        :aria-selected="moderation.resource === 'comments'"
        :class="{ 'moderation-tab--active': moderation.resource === 'comments' }"
        @click="setResource('comments')"
      >
        Komentar
      </button>
    </div>
    <div class="moderation-toolbar">
      <label class="moderation-search"
        ><span class="sr-only">Cari konten atau penulis</span><span>⌕</span
        ><input
          v-model="searchInput"
          type="search"
          placeholder="Cari isi atau nama penulis…" /></label
      ><label class="moderation-control"
        ><span>Filter</span
        ><select v-model="moderation.filter">
          <option value="">Semua konten aktif</option>
          <option value="hidden">Disembunyikan</option>
          <option value="reported">Dilaporkan (pending)</option>
          <option value="flagged">Kata terlarang</option>
          <option value="deleted">Dihapus</option>
        </select></label
      ><label class="moderation-control"
        ><span>Dari tanggal</span><input v-model="moderation.from" type="date" /></label
      ><label class="moderation-control"
        ><span>Sampai tanggal</span><input v-model="moderation.to" type="date"
      /></label>
    </div>
    <div v-if="selected.length" class="bulk-toolbar">
      <strong>{{ selected.length }} dipilih</strong
      ><button class="button button--quiet" @click="bulk('hide')">Sembunyikan</button
      ><button class="button button--quiet" @click="bulk('show')">Tampilkan</button
      ><button class="button button--danger" @click="bulk('delete')">Hapus terpilih</button
      ><button class="bulk-clear" @click="selected = []">Batalkan pilihan</button>
    </div>
    <p v-if="actionError" class="user-error" role="alert">{{ actionError }}</p>
    <p v-if="notice" class="user-notice" role="status">{{ notice }}</p>
    <p v-if="moderation.error" class="user-error" role="alert">
      {{ moderation.error }} <button @click="moderation.fetch">Coba lagi</button>
    </p>
    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="moderation.loading"
      empty-title="Tidak ada konten"
      empty-description="Belum ada konten yang cocok dengan filter ini."
    >
      <template #cell-selection="{ row }"
        ><input
          type="checkbox"
          :checked="selected.includes(Number(row.id))"
          :disabled="Boolean(item(row).deletedAt)"
          :aria-label="`Pilih item ${row.id}`"
          @click.stop
          @change="toggle(Number(row.id))"
      /></template>
      <template #cell-content="{ row }"
        ><div class="moderation-content">
          <p>{{ item(row).content || '〔Konten berupa gambar〕' }}</p>
          <small v-if="context(item(row))">{{ context(item(row)) }}</small>
        </div></template
      >
      <template #cell-author="{ row }"
        ><span class="moderation-author"
          ><strong>{{ item(row).author.displayName }}</strong
          ><small>@{{ item(row).author.username }}</small></span
        ></template
      >
      <template #cell-createdAt="{ row }">{{ date(item(row).createdAt) }}</template>
      <template #cell-reports="{ row }"
        ><span :class="{ 'report-count--pending': item(row).reports.pending > 0 }"
          >{{ item(row).reports.pending }} pending</span
        ><small class="report-total">{{ item(row).reports.total }} total</small></template
      >
      <template #cell-state="{ row }"
        ><span v-if="item(row).deletedAt" class="moderation-state moderation-state--deleted"
          >Dihapus</span
        ><span v-else-if="item(row).hidden" class="moderation-state moderation-state--hidden"
          >Disembunyikan</span
        ><span v-else class="moderation-state moderation-state--visible">Tampil</span></template
      >
      <template #actions="{ row }"
        ><div class="moderation-actions" v-if="!item(row).deletedAt">
          <button
            class="row-action"
            :title="item(row).hidden ? 'Tampilkan kembali' : 'Sembunyikan'"
            :aria-label="item(row).hidden ? 'Tampilkan kembali' : 'Sembunyikan'"
            @click.stop="setHidden(row, !item(row).hidden)"
          >
            {{ item(row).hidden ? '◉' : '⊘' }}</button
          ><button
            class="row-action row-action--delete"
            title="Hapus"
            aria-label="Hapus"
            @click.stop="remove(row)"
          >
            ×
          </button>
        </div>
        <span v-else class="muted-dash">—</span></template
      >
      <template #empty-action
        ><button
          v-if="moderation.filter || searchInput"
          class="button button--quiet"
          @click="() => {
            moderation.filter = ''
            moderation.from = ''
            moderation.to = ''
            searchInput = ''
          }"
        >
          Bersihkan filter
        </button></template
      >
    </AdminDataTable>
    <div class="table-pagination">
      <span
        >Menampilkan <strong>{{ moderation.items.length }}</strong> dari
        <strong>{{ moderation.total }}</strong> item<template v-if="moderation.total">
          · Halaman {{ moderation.pageNumber }}</template
        ></span
      >
      <div>
        <button
          :disabled="moderation.pageIndex === 0 || moderation.loading"
          aria-label="Halaman sebelumnya"
          @click="moderation.previousPage"
        >
          ←</button
        ><span class="page-number">{{ moderation.pageNumber }}</span
        ><button
          :disabled="moderation.nextCursor === null || moderation.loading"
          aria-label="Halaman berikutnya"
          @click="moderation.nextPage"
        >
          →
        </button>
      </div>
    </div>
  </section>
</template>
