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
  --c-brand: #3c5a98; /* navbar (profil #3c5b99, login #3b5893) */
  --c-brand-dark: #29487d; /* ~ border navbar, hover */
  --c-link: #365899; /* ~ tautan dan nama */
  --c-bg: #e8eaec; /* latar halaman (ukur: profil) */
  --c-card-subtle: #f5f7f9; /* latar composer dan tombol sekunder (ukur: profil) */
  --c-card: #ffffff;
  --c-border: #dddfe2; /* ~ border kartu */
  --c-border-soft: #e5e5e5;
  --c-text: #1d2129; /* ~ teks utama */
  --c-text-muted: #909092; /* waktu, label sekunder (ukur: profil) */
  --c-text-on-brand: #ffffff;
  --c-success: #64a355; /* tombol Sign Up 2015: gradien #6bac59 ke #598b48, nilai tengah (ukur: login) */
  --c-success-dark: #4f8140; /* ~ border tombol hijau (tepi luar tidak terukur) */
  --c-danger: #cc0000; /* ~ teks error (tidak ada di referensi) */
  --c-badge: #dd3440; /* badge notifikasi merah (ukur: profil, rata-rata piksel merah) */
  --c-online: #42a05b; /* titik hijau online (ukur: profil) */
  --c-hover-bg: #f6f7f9;
  --c-input-border: #c0c3ce; /* ukur: login */
  --c-highlight: #fff9d7; /* ~ sorotan komentar baru */

  /* Tipografi */
  --font: Helvetica, Arial, 'lucida grande', tahoma, verdana, sans-serif;
  --fs-small: 11px;
  --fs-base: 12px; /* teks utama dan komentar */
  --fs-post: 14px; /* isi status */
  --fs-title: 17px; /* judul bagian */
  --fs-name: 24px; /* ~ nama di profil */
  --lh-base: 1.34;

  /* Jarak dan bentuk */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --radius: 3px;
  --card-border: 1px solid var(--c-border);

  /* Layout */
  --w-page: 980px; /* ~ lebar konten */
  --w-left: 180px; /* ~ menu kiri */
  --w-feed: 510px; /* kolom tengah (ukur: profil, 459 sampai 969) */
  --w-timeline: 849px; /* lebar timeline profil: kolom info + tengah (ukur: profil) */
  --w-right: 300px; /* ~ kolom kanan */
  --w-content: calc(var(--w-left) + var(--w-feed) + var(--w-right) + 2 * var(--sp-3)); /* satu lebar konten untuk semua halaman member */
  --w-chat: 230px; /* strip chat tetap di tepi kanan (referensi profil Maret 2015) */
  --h-navbar: 42px; /* ukur: profil, baris 54 sampai 95 */
  --h-login-header: 78px; /* ukur: login (156 px pada 2x) */
  --h-cover: 315px; /* ~ cover profil */
  --avatar-s: 32px; /* komentar dan chat (ukur) */
  --avatar-m: 40px; /* penulis post (ukur) */
  --avatar-ml: 64px; /* kepala grup (bukan hasil ukur) */
  --avatar-l: 160px; /* foto profil, belum termasuk border putih (ukur) */
  --friend-tile: 105px; /* kotak grid teman (ukur: 106 x 103) */
}
```

### 2.1 Hasil pengukuran (T-08)

Sumber: ref-2 (profil Maret 2015, 1440 x 900 pada 100 persen) dan ref-3 (login, retina 2x). ref-1 (feed 2014) hanya 640 x 400 sehingga tidak dipakai untuk mengukur. Warna diambil dari piksel dominan atau gelap per area; toleransi sekitar 3 per kanal karena kompresi gambar.

| Token | Nilai terkunci | Dasar pengukuran |
|---|---|---|
| `--c-brand` | `#3c5a98` | Navbar profil `#3c5b99`; header login `#3b5893` |
| `--c-bg` | `#e8eaec` | Latar profil (login memakai `#edf0f6`, tidak dipakai) |
| `--c-card-subtle` | `#f5f7f9` | Latar composer status |
| `--c-text-muted` | `#909092` | Waktu post di profil |
| `--c-success` | `#64a355` | Tombol Sign Up 2015 berupa gradien `#6bac59` ke `#598b48` |
| `--c-badge` | `#dd3440` | Piksel merah badge jewel (bervariasi `#cf3446` sampai `#f43138`) |
| `--c-online` | `#42a05b` | Titik hijau chat |
| `--c-input-border` | `#c0c3ce` | Tepi input login |
| `--h-navbar` | 42 px | Baris 54 sampai 95 pada profil |
| `--h-login-header` | 78 px | 156 px pada gambar 2x |
| `--w-feed` | 510 px | Kolom tengah profil, x 459 sampai 969 |
| `--w-timeline` | 849 px | Kolom info (120 sampai 441) ditambah kolom tengah |
| `--avatar-s` / `-m` / `-l` | 32 / 40 / 160 px | Komentar dan chat / penulis post / foto profil |
| `--friend-tile` | 105 px | Grid teman (106 x 103) |
| Font | 12 / 14 / 14 bold / 24 px | Meta dan Like / isi dan nama penulis / nama di cover (dari tinggi huruf) |

Belum terukur (tetap `~`): `--c-brand-dark`, `--c-link`, `--c-text`, `--c-border` (selisih dengan nilai awal di bawah toleransi), `--c-success-dark`, `--c-danger`, `--w-left`, `--w-right`, `--w-page`, `--h-cover` (cover di referensi terpotong), `--fs-title`, `--fs-small`. Pencocokan visual penuh dilakukan di T-28.

Tema Time Travel (bonus): `[data-theme="2010"]` dan `[data-theme="2020"]` hanya menimpa variabel warna, font, dan radius di atas. Status T-67: pengalih tema (`ThemeSwitcher`) disembunyikan dulu dari footer supaya tampilan konsisten; `main.ts` selalu memasang 2015 (komponen dan helper tetap ada), pilihan disimpan di `localStorage` (`rb.theme`), tema 2015 tanpa atribut. Nilai 2010 dan 2020 adalah perkiraan gaya, belum diukur dari referensi.

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

Setiap komponen jadi satu Vue SFC: komponen global di `apps/web/src/components/`, komponen fitur di `apps/web/src/modules/<fitur>/components/`. Penamaan mengikuti kolom "Komponen".

| Komponen | Spesifikasi |
|---|---|
| `NavBar` | Tinggi `--h-navbar`, latar `--c-brand`, border bawah `--c-brand-dark`. Logo kiri, kotak cari (putih, tanpa radius besar), tautan Home dan nama, tiga jewel (permintaan teman, pesan, notifikasi) |
| `Jewel` | Ikon 16 px putih, badge merah `--c-danger` berisi angka di kanan atas, klik membuka dropdown 330 px dengan daftar dan tautan "See All". Badge memakai `--c-badge`, tampil "99+" bila lebih dari 99 dan "N+" bila daftar belum termuat penuh. Dropdown tertutup oleh klik di luar dan Escape. Status T-33: jewel teman (daftar permintaan, Confirm dan Delete Request, See All ke `/friends`) dan notifikasi (membuka dropdown menandai terbaca; baris yang belum dibaca disorot sampai ditutup) aktif dan realtime; jewel pesan hanya menampilkan keadaan kosong sampai chat (T-36). Notifikasi bertipe post membawa ke profil aktor karena halaman `/posts/:id` belum ada di web |
| `SearchBox` | Kotak putih lebar dasar 480 px (ref-2: sekitar 520 px) setinggi 26 px, sudut 2 px, teks 14 px, placeholder "Search for people", segmen ikon kaca pembesar abu terang di kanan (klik sama dengan Enter, membuka `/search?q=`). Dropdown hasil maksimal 8 user dengan avatar 32 px dan nama, navigasi panah keyboard (SRC-01). Status T-39: di tengah navbar, mulai mencari pada 2 karakter dengan jeda 250 ms; baris terakhir "See all results for ..." dan Enter tanpa pilihan membuka `/search?q=`; Escape dan klik di luar menutup; pola combobox ARIA; di bawah 640 px tautan Home disembunyikan supaya kotak cari muat |
| `LeftMenu` | Foto 32 px dan nama di atas; daftar tautan dengan ikon kecil, hover `--c-hover-bg`; kelompok "Favorites", "Apps" (Events, Groups, Notes, Photos) |
| `StatusBox` | Kartu putih bersudut 3 px dengan bayangan tipis; tiga tab berikon warna dipisah garis vertikal ("Update Status" aktif hitam dengan segitiga kecil, "Add Photo", "Create Photo Album" ke `/albums`); garis di bawah tab tidak selebar kartu; `textarea` 2 baris tanpa resize dengan placeholder 16 px (`--fs-composer`); footer (perasaan, privasi berikon, tombol Post) baru tampil saat fokus atau berisi; di detail grup (prop `groupId`) tanpa tab album, privasi, dan tag @, dan post tidak masuk feed utama (ref-5) |
| `PostCard` | Kartu putih, border `--c-border`, radius `--radius`, jarak antar kartu `--sp-3`. Header: avatar `--avatar-m` (40 px, terukur), nama (`--c-link`, tebal), "Nama ▸ Nama" bila wall post, waktu `--c-text-muted`, ikon privasi, menu "…" (edit, hapus, report). Isi `--fs-post`. Gambar selebar kartu. |
| `PostActions` | Baris tautan teks dengan titik tengah: "Like · Comment · Share". Saat sudah like, "Like" berubah menjadi "Unlike" (UX-04). Bukan tombol ikon besar |
| `LikeSummary` | Ikon jempol kecil + "Sari, Budi, and 3 others like this." Nama adalah tautan |
| `CommentList` | Avatar 32 px kiri, nama tebal + teks `--fs-base`, di bawahnya "Like · 2 hrs"; tautan "View more comments" di atas bila ada lebih banyak; kotak input "Write a comment..." dengan ikon kamera (INT-05) |
| `ProfileHeader` | Cover `--h-cover`; foto profil 160 px menumpuk di kiri bawah dengan border putih 1 px; nama putih di atas cover dengan bayangan teks tipis; tombol di kanan bawah cover: Add Friend, Message, atau Update Info dan View Activity Log bila profil sendiri |
| `ProfileTabs` | Baris tab di bawah cover: Timeline, About, Friends (dengan jumlah), Photos, More |
| `InfoCards` | Kartu "About" kiri profil di atas grid teman (kecuali tab About): bio dan baris "Studied at", "Works at", "Lives in", "From", "Born on" dengan ikon kecil (PRF-04); di profil sendiri selalu tampil dengan tautan "Add info", di profil lain hanya bila ada isi dan info tidak privat; kartu "Life Events" dan "Notes" (tanpa tab Notes; catatan panjang dilipat dengan "Show more") di bawah grid teman; grid enam teman 3x2 |
| `YearScroller` | Panel menempel di kanan timeline; daftar tahun, klik melompat ke post tahun itu (PRF-05) |
| `EventsTodayCard`, `SuggestedGroupsCard` | Kartu kolom kanan di feed (EVT-01, GRP-01): "Events today" (event hari ini menurut zona waktu pengguna, tautan ke `/events/:id`) dan "Suggested Groups" (maks. 3 grup publik dengan tombol Join); keduanya tidak dirender bila kosong atau gagal dimuat |
| `PageCard`, `FormRow`, `IconSelect`, `EmptyState`, `LoadingRows`, `Lightbox` | Halaman penuh Fase 3 (Photo Albums, Groups, Events dan detailnya): kartu dengan header abu (judul `--fs-base` tebal, aksi di kanan), form ringkas label-kiri yang terbuka lewat tombol "Create ...", select berikon (privasi), empty state berikon dengan ajakan. Album: grid thumbnail cover; grup: avatar persegi, jumlah anggota, privasi; event: kotak tanggal (bulan dan hari) dan tombol RSVP yang aktif berwarna primary. Kartu "Suggested Groups" kolom kanan disembunyikan di `/groups`. Halaman daftar lain (Friends, Pokes, Search, Activity Log, Blocked) dan form (Update Info, Privacy Settings) memakai pola yang sama; rute dengan `meta.focus` (form dan pengaturan) hanya menampilkan footer di kolom kanan. `LoadingRows` (skeleton dengan teks tersembunyi untuk pembaca layar) menggantikan teks "Loading…"; `Lightbox` membuka foto album dan tab Photos (panah kiri/kanan, Escape menutup, fokus kembali ke pemicu). Halaman 404 dan Maintenance memakai `AuthLayout` |
| `FriendRow` | Avatar 50 px, nama, "N mutual friends", tombol Add Friend atau Confirm (hijau) dan Delete Request. Status T-41: kartu kolom kanan "People You May Know" (baris ringkas: avatar 32 px, nama satu baris, "N mutual friends" dan tombol abu-abu berikon "Add Friend" sejajar, lalu "Request Sent" dengan centang; tombol × di pojok kanan atas hanya terlihat saat hover atau fokus, selalu terlihat di layar sentuh; × menyembunyikan saran hanya di layar) dan "Birthdays" (tanggal lokal pengguna) di atas daftar chat; kartu tidak dirender bila kosong atau gagal dimuat |
| `ChatSidebar` (status T-37: kolom kanan lengket di bawah navbar, titik hijau dan label Web atau Mobile hanya untuk yang online, titik abu bersama teks "Reconnecting…" saat socket putus, badge belum dibaca, kotak cari menyaring nama; tersembunyi di bawah 900 px, jewel pesan tetap membuka jendela) | Kolom kanan tinggi penuh: daftar teman, titik hijau online, label "Web" atau "Mobile", kotak cari di bawah |
| `ChatDock` (status T-37: maksimal tiga jendela, yang tertua ditutup; jendela diciutkan lewat judul, ditutup lewat ×; pesan dikirim optimistis dan bisa dicoba ulang bila gagal; tombol Message di profil teman dan jewel pesan juga membukanya; indikator "{nama} is typing..." di atas kotak pesan, padam sendiri setelah 3 detik diam atau 6 detik tanpa kabar; "Seen" di bawah pesan terakhir yang sudah dibaca lawan, T-38) | Jendela 260 px di dasar layar, header biru dapat diklik untuk ciutkan, daftar pesan, input, indikator "mengetik..." (CHT-03, 04) |
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
| `ref-5-feed-2015.png` | News feed 2015 (1282 x 1235, dari pengguna): navbar dengan gradien dan border bawah gelap, composer tiga tab berikon, kartu post dengan baris cerita, kolom kiri berikon dan berkelompok, kartu kanan berjudul huruf besar abu-abu, strip chat dengan status waktu. Pengukuran navbar: gradien vertikal `#4e69a2` (atas) ke `#3b5998` (bawah), tinggi 42 px termasuk border bawah `#1b316c` 1 px, lalu garis bayangan abu `#abadb0` 1 px |
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
- Audit T-85: semua input di user app dan admin sudah berlabel (dibungkus `<label>` atau `FormRow`). Ditambahkan tautan "Skip to content" (`.skip-link`, target `<main id="main-content">`) dan aturan `prefers-reduced-motion` global di `base.css`. Kontras terukur: `--c-text-muted` 3,19:1 di putih (2,64:1 di `--c-bg`) dan teks putih di `--c-success` 3,04:1, keduanya di bawah AA 4,5:1; token sengaja belum diubah karena diukur dari referensi (keputusan D-8).
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

## 11. Pencocokan visual Fase 1 (T-28)

Screenshot hasil app pada 1440 × 900 ada di `docs/demo/phase1-feed.png` dan `docs/demo/phase1-profile.png`. Feed cocok pada palet biru/abu, kartu putih berbatas tipis, dan tautan aksi teks. Selisih utama dari ref-1: feed sekarang hanya satu kolom tengah; menu kiri hanya memuat profil dan News Feed/Friends; kolom kanan, pencarian, jewel, dan chat belum tersedia. Ini mengikuti fitur Fase 1 yang sudah ada.

Profil memakai cover biru polos dan avatar inisial karena seed tidak menyediakan foto. Susunan cover, avatar bertumpuk, nama, tab, daftar teman, composer, dan timeline sudah mengikuti ref-2. Selisih layout yang terlihat: panel info/About belum berada di samping timeline pada tampilan Timeline; belum ada modul kolom kanan. Screenshot profil juga memperlihatkan tombol Update Info hanya pada profil sendiri.

Token visual inti tampak konsisten pada kedua halaman. Pencocokan nilai piksel lebih presisi ditunda sampai aset foto seed tersedia; screenshot ref-1 berukuran kecil dan tidak cukup untuk pengukuran geometri yang andal. Demo video ada di `docs/demo/phase1-demo.webm`.
4. Perbarui `tokens.css` dan hapus tanda `~` pada dokumen ini.
5. Buat halaman uji `/dev/tokens` yang menampilkan semua komponen untuk dibandingkan berdampingan dengan referensi.

## 12. Pencocokan visual Fase 2 (T-47)

Screenshot 1440 × 900 dan halaman penuh ada di `docs/demo/phase2-chat.png` dan `docs/demo/phase2-wall.png`; demo video `docs/demo/phase2-demo.webm` (skrip: `scripts/phase2-demo.mjs`, dijalankan terhadap seed dev; Alice dan Bob dua browser).

Cocok dengan ref-1: navbar biru dengan wordmark, kolom pencarian putih, jewel teman/pesan/notifikasi dengan badge merah; kolom kanan berisi Birthdays, People You May Know, dan Chat dengan titik hijau online; jendela chat bergaya docked (kepala biru, gelembung pesan, "Seen", "Bob Miller is typing..."); wall post tampil sebagai "Alice Chen ▸ Bob Miller" dan kotak status memakai placeholder "Write something to ...".

Selisih yang tercatat (bukan diperbaiki diam-diam, sesuai test plan bagian 7):
1. Menu kiri ref-1 memuat banyak bagian (Favorites, Pages, Groups, Apps); retrobook hanya News Feed, Friends, Pokes. Sengaja, di luar scope PRD.
2. Chat di ref-1 berupa strip penuh tinggi di tepi kanan layar; di retrobook berupa modul di kolom kanan dan jendela chat melayang di atas feed.
3. Kolom kanan ref-1 punya kartu berita/grup dan ticker aktivitas; retrobook belum (di luar scope).
4. Foto profil seed hanya satu; avatar lain inisial.

### Hasil penyelarasan dengan ref-5 (feed 2015)

- Navbar: gradien `--c-brand-top` ke `--c-brand`, border bawah `--c-brand-edge`, garis bayangan 1 px; tinggi tetap 42 px. Wordmark 27 px, ikon jewel 23 px, kotak cari 480 px.
- Kartu kolom kanan (`PageCard quiet`): judul huruf besar abu-abu kecil tanpa bar latar; Trending berikon tren.
- Menu kiri: foto, nama, tautan "Edit Profile"; item berikon kotak warna (`--c-icon-*`) dengan hitungan (permintaan teman, poke); kelompok "Apps" berjudul huruf besar.
- Kartu post: menu berupa chevron; foto memakai ukuran natural (maksimal 520 px tinggi); komentar menampilkan "waktu · Like · 👍 n".
- Urutan feed berupa tautan kecil "Sort ▾".
- Strip chat: teman offline menampilkan waktu terakhir aktif ("5m", "2h", "3d") dari `lastSeenAt`.
- Footer: "English (US) · Privacy", label parodi, dan "retrobook © 2015".
- Tidak diadopsi dari ref-5 karena tidak ada fiturnya atau akan berupa tautan mati: tombol emoji di komentar, "Group conversations" dan "More friends" di chat, baris cerita "X commented on this", tautan Terms/Cookies/Advertising.
