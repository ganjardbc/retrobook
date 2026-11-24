# UI/UX Spec dan Design Token: Retro Social Network 2015 + Admin Panel

Dibuat 2026-11-24 · Ganjar Hadiatna · Status: draf 1

Spesifikasi tampilan untuk `apps/web` (gaya 2014 sampai Maret 2015) dan panduan singkat untuk `apps/admin`. Semua nilai warna dan ukuran di bawah adalah **perkiraan dari tangkapan layar referensi** dan harus diukur ulang dengan color picker dan penggaris piksel pada gambar asli sebelum dikunci (R-07, UX-09). Setelah diukur, ubah nilai di satu tempat saja: `packages/shared/tokens.css`.

## 1. Prinsip

1. **Identitas sendiri.** Pakai nama, logo, dan ikon buatan sendiri; jangan memakai nama, logo, atau aset merek asli. Tidak ada halaman login yang meniru situs asli (UX-08, UX-12, R-05).
2. **Label parodi** di footer dan halaman register: "Fun project / parodi, bukan produk resmi apa pun".
3. **Satu sumber token.** Warna, jarak, dan font dibaca dari CSS variable (UX-09), sehingga tema Time Travel (THM-01) cukup mengganti nilai.
4. **User app tanpa UI kit pihak ketiga.** CSS ditulis tangan agar terasa autentik (UX-10). Pengecualian: admin panel memakai PrimeVue.
5. **Referensi, bukan target 2019.** Tangkapan layar gaya 2019 hanya pembanding; target adalah feed 2014 dan profil Maret 2015.
6. **Karakter era itu:** sudut hampir kotak, border tipis, tanpa bayangan tebal, teks tautan alih-alih tombol ikon besar, hanya reaksi Like (BR-13).

## 2. Design token

Disalin ke `packages/shared/tokens.css`. Nilai bertanda `~` perlu diukur.

```css
:root {
  /* Warna */
  --c-brand:        #3b5998;  /* ~ navbar, tombol utama */
  --c-brand-dark:   #29487d;  /* ~ border navbar, hover */
  --c-link:         #365899;  /* ~ tautan dan nama */
  --c-bg:           #e9ebee;  /* ~ latar halaman */
  --c-card:         #ffffff;
  --c-border:       #dddfe2;  /* ~ border kartu */
  --c-border-soft:  #e5e5e5;
  --c-text:         #1d2129;  /* ~ teks utama */
  --c-text-muted:   #90949c;  /* ~ waktu, label sekunder */
  --c-text-on-brand:#ffffff;
  --c-success:      #42b72a;  /* ~ tombol Sign Up dan Confirm */
  --c-success-dark: #36a420;
  --c-danger:       #cc0000;  /* ~ badge notifikasi */
  --c-hover-bg:     #f6f7f9;
  --c-input-border: #ccd0d5;
  --c-highlight:    #fff9d7;  /* ~ sorotan komentar baru */

  /* Tipografi */
  --font: Helvetica, Arial, "lucida grande", tahoma, verdana, sans-serif;
  --fs-small: 11px;
  --fs-base:  12px;   /* teks utama dan komentar */
  --fs-post:  14px;   /* isi status */
  --fs-title: 17px;   /* judul bagian */
  --fs-name:  24px;   /* ~ nama di profil */
  --lh-base:  1.34;

  /* Jarak dan bentuk */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px;  --sp-4: 16px;  --sp-5: 24px;
  --radius: 3px;
  --card-border: 1px solid var(--c-border);

  /* Layout */
  --w-page:    980px;  /* ~ lebar konten */
  --w-left:    180px;  /* ~ menu kiri */
  --w-feed:    500px;  /* ~ kolom tengah */
  --w-right:   300px;  /* ~ kolom kanan */
  --h-navbar:  42px;   /* ~ */
  --h-cover:   315px;  /* ~ cover profil */
  --avatar-s:  32px;   --avatar-m: 50px;   --avatar-l: 160px;
}
```

Tema Time Travel (bonus): `[data-theme="2010"]` dan `[data-theme="2020"]` hanya menimpa variabel warna, font, dan radius di atas.

## 3. Layout

Tiga kolom pada lebar 1024 px ke atas, konten di tengah dengan lebar `--w-page`.

```text
┌──────────────────────────── navbar (42px, biru) ───────────────────────────┐
│ [logo] [kotak cari........]  Home   (👥)(💬)(🌐)  nama+foto               │
├───────────┬─────────────────────────────────┬───────────────────────────────┤
│ kiri 180  │ feed 500                        │ kanan 300                     │
│ foto+nama │ [Status | Photo | Life Event]   │ Sponsored                     │
│ menu      │ status box                      │ Birthdays                     │
│ News Feed │ sort: Most Recent ▾             │ Trending                      │
│ Messages  │ kartu post ...                  │ People You May Know           │
│ Events    │                                 │ ────────────────────────────  │
│ Groups    │                                 │ daftar chat teman (tinggi     │
│ ...       │                                 │ penuh, titik hijau)           │
└───────────┴─────────────────────────────────┴───────────────────────────────┘
        chat dock: jendela kecil di dasar layar, maksimal 3 terbuka
```

Perilaku responsif (UX-11): satu breakpoint sederhana di sekitar 900 px menyembunyikan kolom kanan dan menyisakan menu kiri dan feed. Di bawah 640 px menu kiri menjadi menu tarik di navbar. Tidak perlu desain mobile penuh; tujuannya tidak patah di ponsel.

## 4. Komponen

Setiap komponen jadi satu Vue SFC di `apps/web/src/components/`. Penamaan mengikuti kolom "Komponen".

| Komponen | Spesifikasi |
|---|---|
| `NavBar` | Tinggi `--h-navbar`, latar `--c-brand`, border bawah `--c-brand-dark`. Logo kiri, kotak cari (putih, tanpa radius besar), tautan Home dan nama, tiga jewel (permintaan teman, pesan, notifikasi) |
| `Jewel` | Ikon 16 px putih, badge merah `--c-danger` berisi angka di kanan atas, klik membuka dropdown 330 px dengan daftar dan tautan "See All" |
| `SearchBox` | Dropdown hasil maksimal 8 user dengan avatar 32 px dan nama, navigasi panah keyboard (SRC-01) |
| `LeftMenu` | Foto 32 px dan nama di atas; daftar tautan dengan ikon kecil, hover `--c-hover-bg`; kelompok "Favorites", "Apps" (Events, Groups, Notes, Photos) |
| `StatusBox` | Kartu putih; tab teks "Update Status", "Add Photo", "Life Event" (disabled sampai Fase 3); `textarea` 2 baris; tombol Post biru di kanan; selektor privasi (ikon bola dunia, dua orang, gembok) |
| `PostCard` | Kartu putih, border `--c-border`, radius `--radius`, jarak antar kartu `--sp-3`. Header: avatar 50 px, nama (`--c-link`, tebal), "Nama ▸ Nama" bila wall post, waktu `--c-text-muted`, ikon privasi, menu "…" (edit, hapus, report). Isi `--fs-post`. Gambar selebar kartu. |
| `PostActions` | Baris tautan teks: "Like · Comment · Share". Saat sudah like, "Like" berubah menjadi "Unlike" (UX-04). Bukan tombol ikon besar |
| `LikeSummary` | Ikon jempol kecil + "Sari, Budi, and 3 others like this." Nama adalah tautan |
| `CommentList` | Avatar 32 px kiri, nama tebal + teks `--fs-base`, di bawahnya "Like · 2 hrs"; tautan "View more comments" di atas bila ada lebih banyak; kotak input "Write a comment..." dengan ikon kamera (INT-05) |
| `ProfileHeader` | Cover `--h-cover`; foto profil 160 px menumpuk di kiri bawah dengan border putih 1 px; nama putih di atas cover dengan bayangan teks tipis; tombol di kanan bawah cover: Add Friend, Message, atau Update Info dan View Activity Log bila profil sendiri |
| `ProfileTabs` | Baris tab di bawah cover: Timeline, About, Friends (dengan jumlah), Photos, More |
| `InfoCards` | Kartu kiri profil: "Studied at", "Lives in", "From", "Born on" dengan ikon kecil (PRF-04); grid enam teman 3x2 |
| `YearScroller` | Panel menempel di kanan timeline; daftar tahun, klik melompat ke post tahun itu (PRF-05) |
| `FriendRow` | Avatar 50 px, nama, "N mutual friends", tombol Add Friend atau Confirm (hijau) dan Delete Request |
| `ChatSidebar` | Kolom kanan tinggi penuh: daftar teman, titik hijau online, label "Web" atau "Mobile", kotak cari di bawah |
| `ChatDock` | Jendela 260 px di dasar layar, header biru dapat diklik untuk ciutkan, daftar pesan, input, indikator "mengetik..." (CHT-03, 04) |
| `PokeCard` | "Sari poked you." dengan tautan "Poke Back" dan "Remove" |
| `Dropdown`, `Modal` | Border 1 px, bayangan tipis (0 2px 6px rgba(0,0,0,.2)); modal berlatar redup |
| `Button` | Varian `primary` (biru), `success` (hijau), `default` (abu terang). Tinggi 24 sampai 28 px, font 12 px tebal, radius `--radius` |
| `Avatar` | Persegi dengan radius 2 px (bukan bulat), ukuran S/M/L |
| `Toast` | Pesan singkat di bawah navbar, hilang sendiri; dipakai untuk error ringan |

### Status interaktif

| Elemen | Normal | Hover | Aktif atau fokus | Disabled |
|---|---|---|---|---|
| Tautan | `--c-link` | garis bawah | garis bawah | `--c-text-muted` |
| Tombol primary | `--c-brand` | `--c-brand-dark` | sama + garis fokus | pudar 50% |
| Baris daftar | transparan | `--c-hover-bg` | `--c-hover-bg` | n/a |
| Input | border `--c-input-border` | n/a | border `--c-brand` | latar `--c-hover-bg` |

## 5. Halaman referensi per tangkapan layar

Berkas ada di `assets/reference/` (hanya untuk pengukuran dan pembandingan pribadi; tangkapan layar ini milik pihak lain, jadi jangan dipublikasikan atau dimasukkan ke build, dan pertimbangkan menambahkan `docs/assets/reference/` ke `.gitignore` bila repo dibuka ke publik).

| Berkas | Isi |
|---|---|
| `ref-1-feed-2014.png` | News feed 2014: navbar, tiga kolom, status box, kolom kanan, daftar chat |
| `ref-2-profile-maret-2015.webp` | Profil Maret 2015: cover, tab, kartu info, grid teman, scroller tahun, Sponsored, wall post |
| `ref-3-login.webp` | Halaman login dan Sign Up (hanya susunan yang dirujuk) |
| `ref-4-profile-2019-pembanding.webp` | Profil gaya 2019, pembanding saja, bukan target |

| Referensi | Halaman | Hal yang harus cocok |
|---|---|---|
| Feed 2014 | `/` | Navbar biru, tiga kolom, status box, kartu putih, "Like · Comment" berupa teks, kolom kanan dengan daftar chat tinggi penuh |
| Profil Maret 2015 | `/:username` | Cover 315 px, foto profil menumpuk kiri bawah, nama putih di atas cover, tombol Update Info dan View Activity Log, tab, kartu info, grid teman, scroller tahun |
| Halaman login | `/login`, `/register` | Header biru dengan kolom login di kanan, tagline berikon di kiri, form Sign Up dengan tombol hijau. **Hanya susunan; nama, logo, dan ikon buatan sendiri** |
| Pembanding 2019 | tidak dipakai | Hanya untuk melihat apa yang sengaja tidak ditiru |

## 6. Ikon dan aset

- Ikon dibuat sendiri sebagai SVG satu warna (atau sprite) dalam `apps/web/src/assets/icons/`; jangan menyalin sprite dari situs asli.
- Logo: wordmark sederhana buatan sendiri; nama sementara **retrobook** (huruf kecil semua). Logo belum ada, jadi sementara pakai teks "retrobook" dengan font tebal berwarna putih di navbar.
- Avatar bawaan: siluet netral buatan sendiri.
- Gambar seeder: placeholder lisensi bebas atau gambar generik buatan sendiri.

## 7. Teks antarmuka

Bahasa antarmuka: Inggris seperti era aslinya, atau Indonesia; keputusan terbuka (PRD bagian 12). Kunci teks disimpan di satu berkas (`packages/shared/i18n/`) agar bisa ditukar tanpa mengubah komponen. Contoh kunci yang sudah dipakai di dokumen ini: `like`, `unlike`, `comment`, `share`, `addFriend`, `confirm`, `deleteRequest`, `pokeBack`, `writeComment`, `viewMoreComments`, `seeAll`, `updateStatus`, `post`.

Format waktu: relatif ("2 hrs", "Yesterday at 9:41am"), lalu tanggal penuh setelah beberapa hari. Format dihitung di frontend dari UTC.

## 8. Aksesibilitas dasar

- Seluruh form, dropdown, dan jewel bisa dipakai dengan keyboard; urutan Tab mengikuti urutan visual; fokus selalu terlihat.
- Teks utama `--c-text` di atas `--c-card` memenuhi kontras cukup; `--c-text-muted` (~#90949c) di atas putih **hanya sekitar 3:1**, jadi pakai untuk waktu dan label sekunder saja, bukan untuk informasi penting.
- Gambar yang bermakna punya `alt`; avatar dekoratif `alt=""`.
- Badge notifikasi punya teks alternatif ("3 notifikasi belum dibaca").
- Jangan mengandalkan warna saja untuk status online: tambahkan label "Web" atau "Mobile".

## 9. Admin panel

Admin sengaja **tidak** bergaya retro supaya bisa dipakai nyaman: bersih, padat, berbasis tabel. Tetap Vue 3 + Vite, dengan PrimeVue (tema netral) untuk tabel, filter, dan dialog; PrimeVue tidak dipakai di `apps/web`.

| Elemen | Spesifikasi |
|---|---|
| Layout | Sidebar kiri 220 px berisi menu; area konten dengan judul halaman dan tombol aksi di kanan atas |
| Dashboard | Baris kartu angka (total user, post, komentar, aktif hari ini, pendaftar 7 hari, laporan pending) lalu dua grafik garis: pendaftaran dan post per hari (14 hari) |
| Tabel | Kolom dapat diurutkan, filter di atas, pagination cursor ("Muat lagi"), aksi per baris lewat menu "…" |
| Aksi berisiko | Hapus user, ubah role, skors: dialog konfirmasi menyebut nama target; hapus user meminta dua langkah (ADM-05) |
| Antrean laporan | Dua panel: daftar di kiri, detail dan tombol keputusan (Abaikan, Sembunyikan, Hapus, Skors penulis) di kanan; keputusan dan catatan dalam satu layar (target tiga klik, ADM-10) |
| Audit log | Tabel hanya baca dengan filter admin, aksi, dan tanggal; tidak ada tombol ubah atau hapus (ADM-14) |
| Warna | Netral (abu dan putih) dengan satu warna aksen biru mengikuti `--c-brand`; status: hijau ACTIVE, kuning SUSPENDED, merah BANNED |
| Grafik | Pustaka kecil atau SVG tulis sendiri; satu seri per grafik, tanpa legenda berlebih |

## 10. Daftar tugas pengukuran (sebelum token dikunci)

1. Ukur hex dengan color picker pada tangkapan layar untuk: navbar, latar halaman, border kartu, tautan, teks utama, teks sekunder, tombol hijau, badge merah.
2. Ukur dimensi dengan penggaris piksel: tinggi navbar, lebar tiga kolom, tinggi cover, ukuran foto profil dan avatar.
3. Catat ukuran font dan tebal tiap elemen utama (nama, isi status, komentar, waktu).
4. Perbarui `tokens.css` dan hapus tanda `~` pada dokumen ini.
5. Buat halaman uji `/dev/tokens` yang menampilkan semua komponen untuk dibandingkan berdampingan dengan referensi.
