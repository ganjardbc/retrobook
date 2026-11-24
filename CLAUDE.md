# CLAUDE.md

Panduan untuk Claude Code di repo **retrobook**. Baca ini dulu, lalu buka dokumen di `docs/` sesuai tugas.

## Proyek

retrobook adalah jejaring sosial **parodi** bertampilan 2014 sampai Maret 2015: user app, admin panel, dan satu API. Ini fun project (pembelajaran, demo, bahan konten Coderium), bukan produk komersial. Pemilik: Ganjar, yang memutuskan arsitektur.

Status: dokumentasi draf 1 selesai; T-01 (monorepo) dan T-02 (env, Compose opsional) dan T-03 (skema Prisma inti, migrasi pertama), T-04 (kerangka NestJS), T-05 (modul Auth), T-06 (tokens.css, tipe bersama), T-07 (app Vue dasar, login, register), T-08 (token terukur), T-09 (CI dasar), T-10 (layout tiga kolom), T-11 (upload gambar), T-12 (API post, feed, `VisibilityService`), T-14 (StatusBox, PostCard, feed), T-15 (like), T-16 (komentar), T-17 (matriks privasi), T-18 (API pertemanan), T-19 (halaman /friends), T-20 (API profil, timeline), T-21 (UI profil), T-22 (edit profil, foto), T-23 (share post), dan T-24 (tab Friends dan Photos, grid teman) selesai: minggu 3 tuntas; T-31 (gateway Socket.IO `/realtime`) T-32 (API notifikasi), T-33 (Jewel dan badge realtime), T-34 (poke), dan T-35 (wall post dan tag) selesai: minggu 5 tuntas; T-36 (API pesan) selesai. Fase 1 (minggu 1 sampai 4) selesai. Lanjut: T-37 (ChatSidebar dan ChatDock, minggu 6).

## Dokumen (sumber kebenaran)

| Butuh | Buka |
|---|---|
| Gambaran, jadwal 10 minggu, struktur monorepo | `docs/01-roadmap.md` |
| Perilaku, kriteria penerimaan, aturan bisnis BR-01..14 | `docs/02-prd.md` |
| Tabel, relasi, aturan hapus, indeks | `docs/03-erd.md` |
| Endpoint, format error, event Socket.IO | `docs/04-api-spec.md` |
| Rute, router guard, alur | `docs/05-user-flow-sitemap.md` |
| Token CSS, komponen, tampilan | `docs/06-ui-ux-spec.md` |
| Strategi tes, matriks uji, gerbang rilis | `docs/07-test-plan.md` |
| Daftar tugas dan keputusan terbuka | `docs/08-backlog.md` |

Bila dokumen bertentangan: PRD menang untuk perilaku, ERD untuk data, API spec untuk kontrak. Bila kode menyimpang dari dokumen, perbarui dokumennya dalam perubahan yang sama dan sebutkan di ringkasan. Jangan mengubah keputusan yang tercatat tanpa bertanya.

## Stack

Vue 3 + Vite (`apps/web`, `apps/admin`), NestJS (`apps/api`), Prisma + MySQL (`packages/db`), Socket.IO (gateway NestJS), PNPM workspaces, Docker Compose. Tes: Jest (api), Vitest (web, admin), Playwright (e2e). Stack mengikuti proyek Insell supaya pola bisa dipakai ulang.

## Struktur

```text
apps/web        user app (gaya 2015)
apps/admin      admin panel (bersih, tidak retro)
apps/api        NestJS: satu modul per domain
packages/db     Prisma schema, migrasi, seed
packages/shared tipe, konstanta, tokens.css, kunci teks, nama aplikasi
docs/           dokumentasi proyek
```

### Struktur `apps/web` (mengikuti merchant umkm-pos)

Per fitur, bukan per tipe berkas. Alias `@/` menunjuk ke `apps/web/src`.

```text
src/modules/<fitur>/{pages,components,router,services,stores,composables,helpers}
src/core/global-routes.ts   glob modules/**/router/index.ts, guard guest/public, 404 terakhir
src/layouts/                AppLayout
src/components/             komponen global (Avatar, Button, NavBar, ...)
src/plugins/http.ts         klien HTTP; src/helpers/ util bersama
```

Modul: auth, feed, posts (kartu post, komentar, like, share), friends, profile, legal, error. Setiap modul mengekspor rutenya di `router/index.ts`; `meta.app: true` berarti rute berada di dalam AppLayout. Rute dinamis `/:username` otomatis didaftarkan setelah rute statis. Store tetap setup store Pinia (satu `stores/index.ts`), bukan dipecah state/getters/actions.

Nama aplikasi (`retrobook`) disimpan di satu konstanta di `packages/shared`; jangan menulisnya langsung di komponen.

## Perintah

Skrip akar yang sudah jalan: `pnpm install`, `pnpm lint` (ESLint di akar, bukan per paket), `pnpm format:check`, `pnpm typecheck`. Sisanya masih target (dev, test, db, docker menunggu T-02 sampai T-09):

```bash
pnpm install        # juga membangun packages/shared ke dist/ (script prepare), dibutuhkan API dan typecheck
pnpm dev            # web, admin, api bersamaan (belum; sementara: pnpm --filter @retrobook/api dev dan pnpm --filter @retrobook/web dev)
pnpm lint
pnpm -r test        # Jest + Vitest
pnpm test:e2e       # Playwright
pnpm --filter @retrobook/db migrate
pnpm --filter @retrobook/db seed          # belum ada (T-26)
pnpm --filter @retrobook/db migrate:deploy # terapkan migrasi tanpa prompt
pnpm --filter @retrobook/db migrate:test   # migrasi ke DB uji (TEST_DATABASE_URL); wajib sebelum tes API
# default dev TANPA Docker: pakai MySQL lokal (brew), DATABASE_URL di .env
# docker compose up -d mysql mysql-test   # opsional
```

## Aturan yang tidak boleh dilanggar

### Identitas dan hukum
- **Jangan memakai nama, logo, ikon, sprite, atau aset merek asli** dari situs yang ditiru, dan jangan menulis kata "facebook" di UI, kode, atau teks aplikasi. Nama sementara: **retrobook**. Logo belum ada; pakai wordmark teks.
- **Tanpa halaman login atau domain yang meniru situs asli.** Susunan boleh mengacu pada referensi; teks, ikon, dan merek buatan sendiri.
- Label parodi ("Fun project / parodi") wajib di footer dan halaman register.
- Gambar di `docs/assets/reference/` hanya referensi pribadi: jangan dimasukkan ke build, bundle, atau commit publik.
- Reaksi hanya **Like** (BR-13). Jangan menambah reaksi lain, Stories, atau fitur di luar scope PRD tanpa persetujuan.

### Privasi dan keamanan (risiko utama R-03)
- Semua query baca konten (feed, profil, pencarian, hashtag, notifikasi, komentar) **harus lewat service visibilitas terpusat**: privasi post, status pertemanan ACCEPTED, status penulis (BANNED disembunyikan), blokir dua arah, `hidden`, dan `deleted_at` (BR-02, 03, 05, 07, 11). Jangan menulis filter privasi ad hoc di controller atau frontend.
- Otorisasi ditegakkan di server, bukan di frontend. Setiap endpoint mutasi memeriksa kepemilikan atau peran.
- Konten tidak tersedia karena privasi atau blokir mengembalikan 404 yang sama (tidak membocorkan keberadaan).
- Password di-hash (argon2 atau bcrypt) dan tidak pernah ada di respons atau log. Token tidak ditulis ke log. Rahasia hanya dari variabel lingkungan; `.env` ada di `.gitignore`.
- Upload: tipe diperiksa dari isi, maksimum 5 MB, nama berkas diacak.
- Jangan memakai `v-html` untuk konten pengguna.
- Rate limit pada login, register, pesan, dan poke (BR-10).

### Data
- Soft delete (`deleted_at`) untuk users, posts, comments, messages, albums, notes; `hidden` adalah penyembunyian admin dan terpisah dari `deleted_at`.
- Pertemanan: **satu baris per pasangan**; `pair_low_id` dan `pair_high_id` diisi min dan max oleh service (BR-01). Terima, poke ulang, dan tindakan admin berjalan dalam satu transaksi.
- Setiap aksi tulis admin menulis satu baris `audit_logs` dalam **transaksi yang sama**; audit log tidak punya endpoint ubah atau hapus (ADM-14).
- Admin terakhir tidak bisa dihapus, dinonaktifkan, atau diturunkan rolenya (BR-14).
- Semua FK ke `users` memakai RESTRICT; CASCADE hanya untuk data turunan (lihat ERD bagian 5). Waktu disimpan UTC.
- Migrasi Prisma: satu migrasi bernama deskriptif per perubahan; jangan mengedit migrasi yang sudah dijalankan. Perubahan merusak dilakukan bertahap (tambah, salin, hapus pada migrasi berikutnya).

## Konvensi kode

- TypeScript di semua paket; mode strict. Tipe bersama (`UserSummary`, `Post`, enum) hidup di `packages/shared`.
- API: `camelCase` di JSON, `snake_case` di database (Prisma `@map`); tabel jamak, model Prisma tunggal.
- Format error seragam: `{ statusCode, message, code }` (API spec 1.1). Pagination cursor `?limit&cursor` dengan respons `{ items, nextCursor }`.
- NestJS: satu modul per domain (auth, users, posts, comments, likes, friends, pokes, messages, notifications, search, reports, admin/*); validasi lewat DTO (class-validator); guard JWT dan `RolesGuard` untuk `/api/admin/*`.
- Vue: SFC dengan `<script setup lang="ts">`; Pinia untuk state; satu komponen per berkas, nama sesuai `docs/06-ui-ux-spec.md` bagian 4.
- **CSS tulis tangan dengan variabel dari `packages/shared/tokens.css`**; tanpa UI kit pihak ketiga di user app. Jangan menulis warna atau ukuran mentah di komponen bila ada token. **Admin panel memakai PrimeVue** (keputusan Ganjar, 2026-11-24) untuk tabel, filter, dan dialog; tema netral, bukan retro. PrimeVue tidak boleh masuk ke `apps/web`.
- Teks antarmuka lewat kunci di `packages/shared/i18n`, bukan literal di komponen.
- Bahasa: kode, nama variabel, dan commit dalam bahasa Inggris; dokumen dan komentar penjelasan dalam bahasa Indonesia, boleh keduanya bila lebih jelas.

## Cara bekerja

1. Ambil satu tugas dari `docs/08-backlog.md` (ID `T-xx`) dan baca ID kebutuhan PRD yang dirujuknya.
2. Kerjakan berurutan sesuai minggu; jangan loncat ke Fase 3 atau bonus sebelum gerbang fase lulus (R-01, R-02). Pangkas dari bawah bila waktu mepet.
3. Tulis tes bersama kode, terutama untuk aturan privasi, pertemanan, dan admin (`docs/07-test-plan.md`). Fitur selesai bila memenuhi "Definisi selesai" di bagian 9 dokumen itu.
4. Perubahan kecil dan terfokus; satu commit per langkah yang masuk akal. Jangan melakukan refaktor besar di luar tugas.
5. Jangan menambah dependensi baru tanpa alasan jelas; sebut alasannya di ringkasan.
6. Jangan menjalankan perintah merusak (hapus data, reset DB di luar lingkungan dev, `git push --force`) tanpa diminta.
7. Setelah selesai: ringkas apa yang berubah, tes yang dijalankan (dan hasilnya), dokumen yang diperbarui, serta hal yang perlu keputusan Ganjar.

## Keputusan yang masih terbuka

Lihat `docs/08-backlog.md` bagian "Keputusan yang harus diambil". Yang relevan sekarang: logo (wordmark teks sementara), bahasa antarmuka (default Inggris era asli), demo lokal atau publik, masa tunggu anonimisasi (usulan 30 hari), poke hanya antar teman (usulan). Bila tugas bergantung pada keputusan yang belum ditetapkan, pakai usulan di dokumen, catat asumsinya, dan beri tahu Ganjar.

## Preferensi komunikasi dengan Ganjar

Ganjar adalah frontend developer dan tech lead; ia memutuskan arsitektur. Gunakan bahasa Indonesia dengan "aku" dan "kamu" (bukan "gue" atau "lo"), nada hangat seperti mentor, langsung ke inti. Sebut namanya, Ganjar, dalam setiap balasan.
