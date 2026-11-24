# Backlog: Retro Social Network 2015 + Admin Panel

Dibuat 2026-11-24 · Ganjar Hadiatna · Status: draf 1

Backlog awal yang diturunkan dari [PRD](02-prd.md) dan [Roadmap](01-roadmap.md): 10 minggu paruh waktu, gerbang di akhir minggu 4 (Fase 1) dan minggu 7 (Fase 2), admin di minggu 8 dan 9, final di minggu 10. Pengujian per item mengikuti [Test Plan](07-test-plan.md).

**Catatan jadwal:** pembagian tugas per minggu di sini adalah usulan yang sedikit menggeser Roadmap (profil dan teman dimulai di minggu 3 agar gerbang R1 tidak menumpuk di minggu 4, poke dan wall post masuk minggu 5). Gerbang minggu 4, 7, 9, dan 10 tetap sama; bila berbeda, Roadmap menang untuk tanggal gerbang dan Backlog menang untuk urutan tugas.

**Cara baca:** ID tugas `T-xx`; ukuran S (kurang dari setengah hari), M (sekitar satu hari), L (dua sampai tiga hari). Estimasi adalah tebakan awal untuk dikoreksi setelah minggu 1. Status: `[ ]` belum, `[~]` berjalan, `[x]` selesai. Bila waktu mepet, korbankan dari bawah (Bonus, lalu Fase 3), bukan dari inti (R-01).

## Minggu 1: Fondasi

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [x] T-01 | Inisialisasi monorepo PNPM: `apps/web`, `apps/admin`, `apps/api`, `packages/db`, `packages/shared`; lint, format, tsconfig bersama | M | n/a |
| [x] T-02 | Docker Compose dev: MySQL, MySQL uji; variabel lingkungan dan `.env.example` | S | n/a |
| [x] T-03 | Skema Prisma inti Fase 1 dan 2 (users, refresh_tokens, posts, comments, likes, post_tags, hashtags, post_hashtags, friendships, pokes, messages, notifications); migrasi pertama; lengkapi relasi balik | L | ERD |
| [x] T-04 | NestJS: struktur modul per domain, filter error `{ statusCode, message, code }`, validasi global, config | M | API 1.1 |
| [x] T-05 | Modul Auth: register, login, refresh (rotasi), logout; argon2; JWT guard | L | AUTH-01 sampai 03 |
| [x] T-06 | `packages/shared`: `tokens.css` dari UI spec, tipe bersama (`UserSummary`, `Post`, enum) | S | UX-09 |
| [x] T-07 | Vue 3 app dasar: router, Pinia, klien HTTP dengan interceptor refresh, halaman login dan register | M | AUTH-01 sampai 03 |
| [x] T-08 | Pengukuran referensi: ambil hex dan dimensi dari tangkapan layar, kunci `tokens.css` | S | UI 10, R-07 |
| [x] T-09 | CI dasar: lint, test, build; Jest dan Vitest terpasang | S | Test 10 |

Keluaran minggu 1: bisa daftar dan masuk dari browser, token diperbarui otomatis, token visual terkunci.

## Minggu 2: Post, feed, interaksi

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [x] T-10 | Layout tiga kolom, `NavBar`, `LeftMenu`, `Button`, `Avatar` | M | UX-01, 02 |
| [x] T-11 | Upload gambar (multer, validasi isi, batas 5 MB) | M | POST-02 |
| [x] T-12 | API post: buat, baca, edit, hapus (soft delete), pagination cursor | L | POST-01, 05, 06 |
| [x] T-13 | Service visibilitas terpusat (privasi, pertemanan, blokir dua arah, hidden, BANNED, dan wall post) dipakai semua query baca | L | BR-02, 03, 05, 07, 11 |
| [x] T-14 | `StatusBox`, `PostCard`, feed dengan infinite scroll | L | POST-01, 04 |
| [x] T-15 | Like dan unlike post; `LikeSummary` | M | INT-01 |
| [x] T-16 | Komentar: API, `CommentList`, hapus | M | INT-02 |
| [x] T-17 | Tes privasi berparameter (tabel Test 3.3) untuk feed dan post tunggal | M | R-03 |

Keluaran: menulis status, memberi like dan komentar, privasi dasar bekerja dan teruji.

## Minggu 3: Profil dan pertemanan

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [x] T-18 | API pertemanan: kirim, terima, tolak, batalkan, unfriend; baris tunggal per pasangan (min dan max) | L | FRD-01 sampai 03, BR-01 |
| [x] T-19 | Halaman `/friends` dan daftar teman dengan pagination | M | FRD-02, 04 |
| [x] T-20 | API profil dan timeline profil; hubungan dengan pemanggil | M | PRF-01 |
| [x] T-21 | `ProfileHeader`, `ProfileTabs`, `InfoCards` (tab Timeline dan About) | L | PRF-01, 04 |
| [x] T-22 | Edit profil; unggah foto profil dan cover | M | PRF-02, 03 |
| [x] T-23 | Share post; wall post dasar belum (Fase 2) | M | POST-07 |
| [x] T-24 | Tab Friends dan Photos pada profil | M | PRF-01 |

## Minggu 4: Penutup Fase 1 (gerbang R1)

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [x] T-25 | Halaman 404 dan "konten tidak tersedia", status kosong feed | S | User flow 5 |
| [x] T-26 | Seeder dasar: 10 user, post, teman, like untuk demo | M | seed |
| [x] T-27 | E2E-01 sampai 05 (Playwright) | L | Test 4 |
| [x] T-28 | Pencocokan visual dengan referensi feed dan profil; catat selisih | M | UI 7 |
| [x] T-29 | Perbaikan bug, label parodi di footer dan register, halaman privacy | M | UX-12 |
| [x] T-30 | Rekam demo Fase 1 | S | Tujuan |

**Gerbang R1:** semua Must Fase 1 lulus; P1 Test 3.1 sampai 3.4 hijau; demo direkam. Bila belum, hentikan dan selesaikan sebelum Fase 2.

## Minggu 5: Notifikasi dan realtime

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [x] T-31 | Gateway Socket.IO `/realtime`: auth token, room per user, presence | L | CHT-02 |
| [x] T-32 | API notifikasi: pembuatan dari like, komentar, permintaan, terima; `unread-count`; tandai terbaca | M | NTF-01 |
| [x] T-33 | `Jewel` tiga ikon dengan dropdown dan badge realtime | L | NTF-02, UX-01 |
| [x] T-34 | Poke: API, halaman, notifikasi | M | POK-01 |
| [x] T-35 | Wall post dan tag teman, notifikasi, tampilan "Nama ▸ Nama" | L | WAL-01, 02 |

## Minggu 6: Chat dan pencarian

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [x] T-36 | Pesan: API riwayat, kirim, tandai terbaca; event socket, `clientId`, cek teman dan blokir | L | CHT-01 |
| [x] T-37 | `ChatSidebar` dan `ChatDock` (maksimal tiga jendela) | L | CHT-02, 03 |
| [x] T-38 | Indikator mengetik dan terbaca | M | CHT-04 |
| [x] T-39 | Pencarian orang (dropdown di navbar) dan halaman hasil | M | SRC-01 |
| [x] T-40 | Rate limit login, register, pesan, poke | S | BR-10 |

## Minggu 7: Pelengkap Fase 2 (gerbang R2)

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [ ] T-41 | Saran teman (People You May Know) dan kartu birthday | M | FRD-05, 07 |
| [ ] T-42 | Hashtag, trending 24 jam, halaman hashtag | M | POST-10, SRC-02 |
| [ ] T-43 | Sort feed (Most Recent, Top Stories berdasar like) | S | POST-09 |
| [ ] T-44 | `YearScroller` dan endpoint tahun | M | PRF-05 |
| [ ] T-45 | Tombol Report dan API laporan | M | INT-04 |
| [ ] T-46 | Tes realtime dua browser: E2E-06, E2E-07; stabilkan | L | Test 4 |
| [ ] T-47 | Pencocokan visual Fase 2; rekam demo Fase 2 | M | UI 7 |

**Gerbang R2:** semua Must dan Should Fase 2 lulus; realtime stabil pada dua browser; demo direkam.

## Minggu 8: Admin, bagian 1

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [ ] T-48 | Tabel `audit_logs`, `settings`, `announcements`, `blocked_words`, `reports`; migrasi | M | ERD |
| [ ] T-49 | `RolesGuard` dan rute `/api/admin/*`; seed atau CLI admin pertama | M | ADM-01 |
| [ ] T-50 | Helper audit transaksional dipakai semua aksi tulis admin | M | ADM-14 |
| [ ] T-51 | Admin app: layout, login, router guard, komponen tabel dan filter | L | ADM-01 |
| [ ] T-52 | Dashboard: statistik dan dua grafik | L | ADM-02 |
| [ ] T-53 | Manajemen user: daftar, detail, status (cabut sesi), role, reset password, hapus; perlindungan admin terakhir | L | ADM-03 sampai 07, BR-14 |

## Minggu 9: Admin, bagian 2 (gerbang R3)

| ID | Tugas | Ukuran | PRD |
|---|---|---|---|
| [ ] T-54 | Moderasi post dan komentar: sembunyikan, tampilkan, hapus, aksi massal | L | ADM-08, 09, BR-07 |
| [ ] T-55 | Antrean laporan dengan keputusan sekali panggil (tiga klik) | L | ADM-10 |
| [ ] T-56 | Kata terlarang: kelola, filter saat tulis, tandai konten lama | M | ADM-11, BR-08 |
| [ ] T-57 | Pengaturan sistem: maintenance mode, buka atau tutup pendaftaran; halaman `/maintenance` | M | ADM-12, BR-12 |
| [ ] T-58 | Pengumuman dan banner, notifikasi ANNOUNCEMENT | M | ADM-13 |
| [ ] T-59 | Halaman audit log hanya baca | S | ADM-14 |
| [ ] T-60 | Tes admin: semua rute menolak non-admin; E2E-08 sampai 10 | L | Test 3.6, 4 |

**Gerbang R3:** semua Must admin lulus; alur laporan tiga klik tercatat di audit; demo admin direkam.

## Minggu 10: Final (gerbang R4)

Isi minggu ini bergantung waktu yang tersisa; urutkan dari atas dan berhenti bila waktu habis.

| ID | Tugas | Ukuran | Prioritas |
|---|---|---|---|
| [ ] T-61 | Hardening: daftar periksa keamanan Test 6; CORS, rahasia, log | M | wajib |
| [ ] T-62 | Docker Compose produksi (web, admin, api, mysql), `.env.production.example`, volume uploads | M | wajib |
| [ ] T-63 | Uji performa (p95 < 300 ms) dan perbaikan indeks | M | wajib |
| [ ] T-64 | README akar, panduan menjalankan, label parodi, demo akhir | M | wajib |
| [ ] T-65 | Seeder lengkap (30 user, 200 post, 120 pertemanan, 300 pesan) | M | wajib |
| [ ] T-66 | Bot AI sebagai teman (job, persona, kontrol admin) | L | bonus |
| [ ] T-67 | Tema Time Travel (2010, 2015, 2020) lewat token | M | bonus |
| [ ] T-68 | Satu atau dua fitur Fase 3: block (FRD-06) dan activity log (ACT-01) lebih dulu, lalu album | L | bonus |
| [ ] T-69 | Sponsored dan kelola trending | M | bonus |
| [ ] T-70 | Reset password via email bila penyedia sudah dipilih | M | bonus |

**Gerbang R4:** Test 8 terpenuhi; compose produksi berjalan dari nol; demo siap.

## Backlog di luar jadwal (Fase 3 sisa)

| ID | Tugas | PRD |
|---|---|---|
| [ ] T-71 | Album foto dan halaman album | ALB-01 |
| [ ] T-72 | Grup sederhana dan post grup | GRP-01 |
| [ ] T-73 | Event dan RSVP | EVT-01 |
| [ ] T-74 | Notes | NOT-01 |
| [ ] T-75 | Life Event di timeline | LIF-01 |
| [ ] T-76 | Privacy setting profil detail | PRF-06 |
| [ ] T-77 | Hapus akun dengan anonimisasi terjadwal | AUTH-06, BR-06 |
| [ ] T-78 | Foto di komentar | INT-05 |
| [ ] T-79 | Like komentar | INT-03 |
| [ ] T-80 | Feeling atau aktivitas pada post | POST-08 |

## Keputusan yang harus diambil (blokir)

| # | Keputusan | Dibutuhkan sebelum | Usulan |
|---|---|---|---|
| D-1 | Nama final dan logo | Minggu 1 (label parodi, header) | Nama kerja dulu, ganti lewat satu konstanta |
| D-2 | Bahasa antarmuka (Inggris atau Indonesia) | Minggu 2 (teks komponen) | Inggris era asli; kunci teks terpisah |
| D-3 | Hanya demo lokal atau dibuka publik | Minggu 10 | Lokal dulu |
| D-4 | Masa tunggu anonimisasi akun | T-77 | 30 hari |
| D-5 | Aturan umur token dan batas rate limit | Minggu 1 dan 6 | 15 menit dan 30 hari; angka di API spec |
| D-6 | Poke hanya antar teman atau semua | T-34 | Hanya antar teman |
| D-7 | Penyedia email dan model bahasa | T-70 dan T-66 | Tunda; keduanya opsional |

## Risiko yang dipantau tiap akhir minggu

| ID | Risiko | Sinyal | Tindakan |
|---|---|---|---|
| R-01 | Scope creep | Tugas baru di luar daftar | Masukkan ke "di luar jadwal", jangan kerjakan |
| R-02 | Berebut waktu dengan Insell | Blok waktu terlewat dua minggu beruntun | Potong Fase 3 dan bonus |
| R-03 | Aturan privasi bocor | Tes 3.3 gagal atau ada query baca baru tanpa service visibilitas | Tahan rilis, perbaiki dulu |
| R-06 | Realtime membebani | Pesan lambat lebih dari 1 detik | Profil dan pertimbangkan Redis adapter |
| R-07 | Visual terasa tidak autentik | Selisih besar di pencocokan visual | Ukur ulang token, sesuaikan sebelum menambah fitur |
