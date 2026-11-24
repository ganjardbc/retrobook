# Test Plan: Retro Social Network 2015 + Admin Panel

Dibuat 2026-11-24 · Ganjar Hadiatna · Status: draf 1

Rencana pengujian untuk monorepo (`apps/web`, `apps/admin`, `apps/api`, `packages/*`). Tujuan utamanya sama dengan PRD bagian 2: alur utama selalu hijau dan **aturan privasi benar-benar ditegakkan** (R-03). Kebutuhan merujuk ke [PRD](02-prd.md), endpoint ke [API Spec](04-api-spec.md).

## 1. Strategi

| Lapisan | Alat | Cakupan | Dijalankan |
|---|---|---|---|
| Unit API | Jest | Service dan guard: privasi, pertemanan simetris, validasi, rate limit, filter kata | Setiap commit lokal dan CI |
| Integrasi API | Jest + Supertest + MySQL uji | Controller sampai database nyata: auth, visibilitas, transaksi, audit | CI |
| Unit web dan admin | Vitest + Vue Test Utils | Komponen, store, interceptor refresh token, format waktu | Setiap commit lokal dan CI |
| End-to-end | Playwright | Alur utama user dan satu alur admin, dua browser untuk realtime | CI sebelum rilis |
| Performa ringan | Skrip k6 atau autocannon | p95 baca di bawah 300 ms pada seed (PRD bagian 2) | Manual per rilis |
| Keamanan dasar | Daftar periksa manual + tes otomatis | Otorisasi, upload, XSS, rate limit | Per rilis |

Piramida yang dituju: banyak unit dan integrasi untuk logika privasi, sedikit e2e untuk alur emas. Jangan menguji CSS piksel-demi-piksel secara otomatis; kesesuaian visual dicek manual terhadap referensi (bagian 7).

## 2. Lingkungan dan data uji

- **Database uji terpisah**: MySQL di Docker Compose (`mysql-test`), schema dimigrasi dengan Prisma Migrate sebelum suite; tiap berkas integrasi memulai dari transaksi atau truncate agar independen.
- **Fixture standar** (helper `createWorld()` di `packages/db/test`):
  - Pengguna: `alice` dan `bob` (teman), `carol` (bukan teman), `dave` (memblokir `alice`), `erin` (SUSPENDED), `frank` (BANNED), `root` (ADMIN).
  - Post: tiap pengguna punya satu post PUBLIC, FRIENDS, dan ONLY_ME; satu post `hidden`; satu post soft-deleted.
- **Seed demo** (30 user, 200 post) hanya untuk performa dan demo, bukan untuk tes fungsional.
- Waktu dikendalikan dengan jam palsu agar tes tidak flaky (rate limit, kedaluwarsa token, trending 24 jam).
- Socket.IO diuji dengan dua klien nyata pada server uji.

## 3. Matriks pengujian per kebutuhan

Prioritas P1 harus lulus sebelum gerbang fase; P2 sebelum rilis akhir.

### 3.1 Autentikasi dan akun

| ID | Kasus | Level | P |
|---|---|---|---|
| AUTH-01 | Daftar sukses; email dan username kembar ditolak (409); password 7 karakter ditolak; username berupa rute cadangan (`admin`, `settings`) ditolak | integrasi | P1 |
| AUTH-01 | Pendaftaran ditutup (`registration_open=false`) menghasilkan 403 | integrasi | P1 |
| AUTH-02 | Login dengan email dan dengan username; salah password dan akun tidak ada memberi pesan yang sama | integrasi | P1 |
| AUTH-02 | Logout mencabut refresh token; token itu tidak bisa dipakai lagi | integrasi | P1 |
| AUTH-03 | Access token kedaluwarsa diperbarui otomatis oleh interceptor; banyak request bersamaan hanya memicu satu refresh | unit web | P1 |
| AUTH-03 | Refresh token yang sudah dirotasi dipakai lagi mencabut semua token user itu | integrasi | P1 |
| AUTH-04 | SUSPENDED dan BANNED tidak bisa login (403) dan semua refresh token dicabut saat status berubah | integrasi | P1 |
| AUTH-05 | Tautan reset sekali pakai, kedaluwarsa, tidak bisa dipakai ulang | integrasi | P2 |
| AUTH-06 | Hapus akun: login gagal setelahnya, konten tersembunyi, token dicabut | integrasi | P2 |
| Rate limit | Percobaan login ke-11 dalam semenit mendapat 429 dengan `Retry-After` (BR-10) | integrasi | P1 |

### 3.2 Post, feed, interaksi

| ID | Kasus | Level | P |
|---|---|---|---|
| POST-01 | 5.000 karakter lolos, 5.001 ditolak; teks kosong tanpa gambar ditolak; kata terlarang ditolak dengan `CONTENT_BLOCKED_WORD` | integrasi | P1 |
| POST-02 | Upload JPG, PNG, WebP lolos; 5 MB lebih satu byte 413; `.exe` bernama `.jpg` 415 | integrasi | P1 |
| POST-04 | Feed hanya berisi post teman dan sendiri, terbaru di atas, 10 per halaman, kursor stabil saat ada post baru | integrasi | P1 |
| POST-05 | Hanya pemilik yang bisa edit; post ditandai `editedAt` | integrasi | P1 |
| POST-06 | Hapus post menyembunyikan komentar dan like dari semua query | integrasi | P1 |
| POST-07 | Share merujuk asal; bila asal dihapus, share menampilkan "tidak tersedia" | integrasi | P1 |
| POST-09 | `sort=top` mengurutkan berdasarkan jumlah like | integrasi | P2 |
| POST-10 | `#tag` membuat hashtag dan relasi; ditampilkan di trending | integrasi | P2 |
| INT-01 | Like dua kali tetap satu baris; unlike menghapus; jumlah benar | integrasi | P1 |
| INT-01 | Ringkasan "A, B, and N others" benar untuk 0, 1, 2, 3, dan banyak penyuka | unit | P1 |
| INT-02 | Komentar urut lama ke baru; hanya pemilik komentar atau pemilik post yang bisa menghapus | integrasi | P1 |
| INT-04 | Report: satu per pelapor per target (409), muncul di antrean admin | integrasi | P1 |

### 3.3 Privasi dan visibilitas (inti R-03)

Satu tabel keputusan diuji sebagai tes berparameter terhadap **setiap endpoint pembaca** (feed, timeline profil, `GET /posts/:id`, pencarian, hashtag, notifikasi, daftar komentar). Penonton yang diuji: pemilik, teman, bukan teman, pemblokir, diblokir, BANNED, tamu.

| Post milik `alice` | alice | bob (teman) | carol (bukan teman) | dave (memblokir alice) | tamu |
|---|---|---|---|---|---|
| PUBLIC | lihat | lihat | lihat | tidak (404) | tidak (401) |
| FRIENDS | lihat | lihat | tidak | tidak | tidak |
| ONLY_ME | lihat | tidak | tidak | tidak | tidak |
| `hidden=true` | lihat | tidak | tidak | tidak | tidak |
| soft-deleted | tidak | tidak | tidak | tidak | tidak |
| alice BANNED | n/a | tidak | tidak | tidak | tidak |

Status implementasi (T-17): `apps/api/src/modules/visibility/visibility.matrix.spec.ts` menguji 13 keadaan post (privasi, hidden, soft-deleted, penulis BANNED/SUSPENDED/terhapus) terhadap 6 jenis penonton (pemilik, teman dari dua arah, peminta PENDING dari dua arah, orang asing) di endpoint detail, daftar komentar, daftar penyuka, feed, like, komentar baru, dan edit, ditambah tamu (401) dan transisi (ubah privasi, terima teman, unfriend, hidden, ban). Ekspektasi ditulis dari tabel aturan, bukan dari implementasi; tes ini sudah dibuktikan gagal bila filter `hidden`, pertemanan, atau status penulis dilepas. Penonton "memblokir" dan "diblokir", wall post, pencarian, hashtag, dan notifikasi tercatat sebagai `it.todo` sampai fiturnya ada.

Admin melihat semua termasuk `hidden` lewat `/api/admin/*` saja. Kasus tambahan: wall post terlihat oleh pemilik dinding dan penulis (BR-04), pemilik dinding dapat menghapusnya; setelah unfriend, FRIENDS yang tadinya terlihat langsung hilang; setelah blokir, pertemanan dan permintaan dihapus (BR-11).

### 3.4 Pertemanan, poke, blokir

| ID | Kasus | Level | P |
|---|---|---|---|
| FRD-01 | Tidak bisa mengirim ke diri sendiri (422), ke yang sudah teman (409), ke yang memblokir (404) | integrasi | P1 |
| FRD-02, BR-01 | Terima mengubah satu baris menjadi ACCEPTED; kedua pihak melihat hubungan; `pair_low_id` dan `pair_high_id` terisi min dan max | integrasi | P1 |
| BR-01 | Permintaan silang A→B lalu B→A langsung menjadi teman dan tidak membuat baris kedua (UNIQUE) | integrasi | P1 |
| FRD-03 | Unfriend menghapus baris untuk kedua arah | integrasi | P1 |
| FRD-05 | Saran teman tidak memuat teman, diri sendiri, diblokir, BANNED, atau bot | integrasi | P2 |
| POK-01 | Poke ulang memperbarui baris yang sama, tidak menambah; poke balik; rate limit 20 per jam | integrasi | P2 |
| FRD-06 | Blokir dua arah menyembunyikan profil, post, pencarian, dan chat | integrasi | P2 |

### 3.5 Notifikasi dan chat

| ID | Kasus | Level | P |
|---|---|---|---|
| NTF-01 | Like, komentar, permintaan, terima, poke, tag membuat notifikasi; aksi pada konten sendiri tidak | integrasi | P2 |
| NTF-02 | Badge `unread-count` naik saat event `notification:new`; membuka menandai terbaca | e2e | P2 |
| CHT-01 | Pesan dari A sampai ke B dalam waktu singkat tanpa reload; riwayat tersimpan | e2e (dua browser) | P2 |
| CHT-01 | `clientId` sama dikirim dua kali tidak membuat pesan ganda | integrasi | P2 |
| CHT-01 | Chat dengan bukan teman atau yang diblokir ditolak di server untuk setiap event | integrasi | P2 |
| CHT-02 | Presence: online saat koneksi pertama, offline saat koneksi terakhir putus, `last_seen_at` terisi | integrasi | P2 |
| CHT-04 | Indikator mengetik dan terbaca tersampaikan; dibatasi satu per detik | integrasi | P2 |
| Realtime | Token tidak valid memutus koneksi socket | integrasi | P2 |

### 3.6 Admin

| ID | Kasus | Level | P |
|---|---|---|---|
| ADM-01 | User biasa mendapat 403 di semua `/api/admin/*`; tanpa token 401 (diuji sebagai tes berparameter pada seluruh rute admin) | integrasi | P1 |
| ADM-02 | Angka dashboard sama dengan hitungan langsung di database | integrasi | P1 |
| ADM-04 | Ubah status memutus sesi; setiap perubahan menulis `audit_logs` dalam transaksi yang sama (jika audit gagal, perubahan dibatalkan) | integrasi | P1 |
| ADM-08, BR-07 | Sembunyikan post: hilang untuk user, terlihat di admin; tampilkan lagi memulihkan | integrasi | P1 |
| ADM-10 | Putuskan laporan (abaikan, sembunyikan, hapus, skors) mengubah status dan mencatat audit dalam satu panggilan | integrasi | P1 |
| ADM-11, BR-08 | Kata terlarang ditolak saat tulis dan konten yang sudah memuatnya ditandai | integrasi | P2 |
| ADM-12, BR-12 | Maintenance mode: non-admin 403, admin tetap bisa masuk | integrasi | P2 |
| ADM-14 | Audit log tidak punya endpoint ubah atau hapus (PATCH dan DELETE 404 atau 405) | integrasi | P1 |
| BR-14 | Tidak bisa menghapus, menonaktifkan, atau menurunkan admin terakhir (422) | integrasi | P1 |
| ADM-07 | Admin tidak bisa menurunkan dirinya sendiri bila admin terakhir | integrasi | P1 |

### 3.7 Fase 3 dan bonus

| ID | Kasus | P |
|---|---|---|
| ALB-01, GRP-01, EVT-01, NOT-01, LIF-01 | CRUD dasar, privasi mengikuti aturan yang sama, anggota grup saja yang bisa membaca post grup | P2 |
| ACT-01 | Activity log hanya milik sendiri, hapus item mengikuti soft delete | P2 |
| BOT-01, BR-09 | Bot tidak bisa login; kontennya melewati filter yang sama; tidak dihitung sebagai user aktif | P2 |
| THM-01 | Ganti tema hanya mengubah nilai variabel, layout tidak bergeser | P2 |

## 4. Skenario end-to-end (Playwright)

Dijalankan pada Chromium; skenario realtime memakai dua konteks browser. Data di-reset sebelum tiap berkas.

| Kode | Skenario | Gerbang |
|---|---|---|
| E2E-01 | Daftar, masuk ke feed kosong, tulis status, status muncul di atas | Fase 1 |
| E2E-02 | Alice mengirim permintaan teman ke Bob; Bob menerima; keduanya saling melihat status FRIENDS | Fase 1 |
| E2E-03 | Alice menulis post FRIENDS dan ONLY_ME; Bob hanya melihat yang pertama; Carol tidak melihat keduanya | Fase 1 |
| E2E-04 | Bob me-like dan mengomentari; ringkasan like dan jumlah komentar benar | Fase 1; notifikasi Alice diverifikasi setelah T-32 (Fase 2) |
| E2E-05 | Edit dan hapus post; hapus tidak meninggalkan jejak di feed | Fase 1 |
| E2E-06 | Chat dua arah realtime dengan indikator mengetik dan terbaca | Fase 2 |
| E2E-07 | Alice menulis di dinding Bob (wall post); tampil sebagai "Alice ▸ Bob"; Bob bisa menghapusnya | Fase 2 |
| E2E-08 | Report oleh member, lalu admin memutuskan dalam tiga klik; audit log tercatat | Fase 3 (admin) |
| E2E-09 | Admin menyembunyikan post; hilang di user app, terlihat di admin panel | Fase 3 (admin) |
| E2E-10 | Suspend user: sesi aktif berakhir pada request berikutnya dan login ditolak | Fase 3 (admin) |

## 5. Pengujian non-fungsional

| Aspek | Uji | Ambang |
|---|---|---|
| Performa baca | 50 permintaan paralel ke `/feed` dan `/users/:u/posts` pada seed 30 user dan 200 post | p95 < 300 ms (PRD) |
| Paginasi | Feed 10 per halaman memuat berturut-turut tanpa duplikat atau lompatan saat post baru masuk | 0 duplikat |
| Realtime | Waktu kirim sampai terima pesan pada mesin dev | < 500 ms rata-rata |
| Keamanan | Lihat bagian 6 | semua lulus |
| Kompatibilitas | Chrome, Firefox, Safari, Edge terbaru: login, feed, profil, chat | tidak ada pemblokir |
| Layar | 1280, 1024, 900, dan 390 px: tidak ada layout patah | tidak ada scroll horizontal |
| Aksesibilitas | Tab melalui form login, status box, dropdown jewel; kontras teks utama | semua dapat dioperasikan |

## 6. Daftar periksa keamanan

- Setiap endpoint mutasi memeriksa kepemilikan atau peran di server (uji dengan mengganti ID di URL milik orang lain).
- ID di URL milik user lain menghasilkan 404 atau 403, bukan data (uji IDOR pada post, komentar, pesan, album, catatan).
- Password hash tidak pernah muncul di respons mana pun (uji dengan pencarian pola pada seluruh respons uji integrasi).
- Upload: tipe diperiksa dari isi, ukuran dibatasi, nama berkas diacak, tidak bisa menulis di luar folder uploads.
- XSS: isi post, komentar, bio, nama tampilan, dan nama album berisi `<script>` dan `"><img onerror>` ditampilkan sebagai teks; frontend tidak memakai `v-html` untuk konten pengguna.
- SQL injection: Prisma terparameter; parameter `q` pencarian diuji dengan `' OR 1=1 --`.
- Rate limit aktif pada login, register, pesan, dan poke.
- CORS hanya mengizinkan origin web dan admin.
- Rahasia (JWT secret, kredensial DB) hanya dari variabel lingkungan; `.env` ada di `.gitignore`.
- Token tidak ditulis ke log.

## 7. Pemeriksaan visual manual

Karena target visual adalah era 2015, setiap fase diakhiri satu sesi pembandingan berdampingan dengan tangkapan layar referensi:

1. Buka halaman uji `/dev/tokens` (lihat [UI/UX Spec](06-ui-ux-spec.md) bagian 10) dan bandingkan dengan referensi.
2. Centang daftar: warna navbar, lebar tiga kolom, tinggi cover, bentuk avatar, tautan "Like · Comment", badge jewel.
3. Catat selisih sebagai tugas di backlog; jangan diperbaiki diam-diam.

## 8. Gerbang rilis

| Rilis | Syarat lulus |
|---|---|
| R1 (Fase 1, minggu 4) | Seluruh P1 pada 3.1, 3.2, 3.3, 3.4; E2E-01 sampai 05 hijau; demo direkam |
| R2 (Fase 2, minggu 7) | Seluruh P1 dan P2 untuk Fase 2; E2E-06 dan 07 hijau pada dua browser; realtime stabil |
| R3 (Admin, minggu 9) | Seluruh P1 pada 3.6; E2E-08 sampai 10 hijau; semua rute admin menolak non-admin |
| R4 (Final, minggu 10) | Daftar periksa keamanan bagian 6 lulus; performa bagian 5 tercapai; Docker Compose produksi berjalan dari nol; README dan demo siap |

## 9. Definisi selesai untuk satu fitur

1. Kriteria penerimaan di PRD terpenuhi.
2. Tes unit atau integrasi untuk logika bisnis dan penolakan ditulis dan hijau.
3. Aturan privasi yang disentuh punya satu baris di tabel bagian 3.3.
4. Tindakan admin menulis audit log dan ada tesnya.
5. Tidak ada `console.error` atau peringatan Vue pada alur fitur.
6. Backlog diperbarui dan dokumen yang terdampak (API spec, ERD) disesuaikan.

## 10. Pipeline CI (usulan)

Satu workflow: pasang PNPM, `prisma migrate deploy` ke MySQL layanan, `pnpm lint`, `pnpm -r test` (Jest dan Vitest), `pnpm build`, lalu Playwright terhadap compose uji. E2E dijalankan pada pull request ke `main` dan sebelum rilis; unit dan integrasi pada setiap push.
