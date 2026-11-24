# PRD: Retro Social Network 2015 + Admin Panel

Dibuat 2026-11-24 · Ganjar Hadiatna

## 1. Ringkasan produk

Retro Social Network (nama kerja, nama final belum ditetapkan) adalah jejaring sosial parodi dengan tampilan antarmuka 2014 sampai Maret 2015, terdiri dari user app, admin panel, dan satu API, dibangun di stack yang sama dengan Insell.

- Latar belakang: nostalgia pada UI lama sosial media besar, sekaligus kesempatan melatih arsitektur fullstack (auth, relasi data, realtime, moderasi) dengan hasil yang bisa dijadikan konten Coderium.
- Peluang: proyek ini bukan produk komersial; nilainya ada pada pembelajaran, demo, dan konten. PRD ini karena itu menjaga scope agar tidak melebar dan tidak menyaingi waktu untuk Insell.
- Produk dalam satu kalimat: tempat member menulis status, berteman, mengobrol, dan saling memberi Like dengan tampilan era 2015, dikelola lewat admin panel.
- Status dokumen: draf 1. Sumber: dokumen Roadmap Lengkap dan empat tangkapan layar referensi UI.

## 2. Tujuan dan metrik keberhasilan

Tujuan utama adalah menyelesaikan Fase 1 sampai layak dipamerkan dalam 4 minggu, lalu melengkapi sampai admin panel dalam 10 minggu. Target di bawah adalah usulan awal untuk disepakati.

| Tujuan | Metrik | Target usulan |
|---|---|---|
| Fase 1 layak dipamerkan | Alur daftar, posting, like, komentar, teman berjalan end-to-end | Selesai akhir minggu 4 |
| Kualitas alur utama | Tes e2e Playwright untuk alur utama user dan satu alur admin | 100% lulus pada setiap build |
| Privasi benar | Tes otomatis untuk setiap aturan privasi (BR-02 sampai BR-04, BR-11) | Seluruh aturan tercakup tes |
| Performa wajar | Waktu respons baca API pada data seed (30 user, 200 post) di mesin dev | p95 di bawah 300 ms |
| Admin efisien | Langkah memproses satu laporan (lihat, putuskan, tercatat) | Tiga klik atau kurang |
| Bernilai sebagai konten | Demo video per fase | Satu video per fase selesai |

Bukan tujuan: bersaing dengan jejaring sosial nyata, menarik pengguna dalam jumlah besar, atau menghasilkan pendapatan.

## 3. Persona dan peran

Ada empat peran dengan kebutuhan berbeda; peran menentukan akses di API dan guard role.

| Peran | Siapa | Kebutuhan utama | Akses |
|---|---|---|---|
| Pengunjung | Orang yang belum login | Melihat halaman login dan daftar | Hanya halaman login, register, dan kebijakan privasi |
| Member | Pengguna terdaftar, misalnya penonton nostalgia atau teman yang diundang mencoba | Menulis status, berteman, chat, mencari orang, melaporkan konten | User app sesuai pengaturan privasi |
| Admin | Pemilik proyek atau moderator | Memantau statistik, memoderasi konten, menangani laporan, mengatur sistem | Admin panel dan route /admin/* |
| Bot | Akun otomatis penghidup feed | Memposting dan membalas komentar | Tanpa login; hanya lewat layanan internal |

Persona rujukan:

- Penonton nostalgia: ingin merasakan UI 2015 yang akurat dan cepat dipahami tanpa petunjuk.
- Admin solo: mengerjakan sendiri, butuh alat moderasi yang cepat dan jejak audit yang jelas.

## 4. Ruang lingkup

Scope dibagi per fase mengikuti roadmap; Fase 1 adalah titik berhenti yang sudah layak dipamerkan.

| Fase | Termasuk |
|---|---|
| Fase 1: Inti | Akun, feed, status box, foto, like, komentar, share, profil, pertemanan, menu sidebar kiri |
| Fase 2: Ciri khas 2015 | Notifikasi, chat sidebar dan dock, poke, wall post, tag, pencarian, saran teman, trending, birthday, sort feed, scroller tahun, tombol Report |
| Admin | Dashboard, manajemen user, moderasi, laporan, kata terlarang, pengaturan sistem, pengumuman, audit log |
| Fase 3: Pelengkap | Album, grup, event, notes, life event, activity log, privacy setting, block |
| Bonus | Bot AI, tema Time Travel, seeder data dummy, Sponsored |

Tidak termasuk:

- Aplikasi mobile native, siaran langsung, unggah video, panggilan suara atau video
- Reactions selain Like (belum ada di era 2015), Stories, dan algoritma feed berbasis AI
- Iklan nyata, pembayaran, dan monetisasi
- Chat grup dan enkripsi end-to-end
- Penggunaan nama, logo, atau aset merek asli

## 5. Kebutuhan fungsional: user app

Prioritas memakai MoSCoW (Must, Should, Could); kolom Fase mengikuti scope di atas. Setiap ID dipakai ulang di backlog, tes, dan dokumen API.

### Autentikasi dan akun

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| AUTH-01 | Registrasi | Must | 1 | Email dan username unik; password minimal 8 karakter; ditolak jika pendaftaran ditutup admin |
| AUTH-02 | Login dan logout | Must | 1 | Login dengan email atau username; logout mencabut refresh token |
| AUTH-03 | Pembaruan sesi | Must | 1 | Access token yang kedaluwarsa diperbarui otomatis; sesi tidak valid diarahkan ke login |
| AUTH-04 | Akun SUSPENDED atau BANNED | Must | Admin | Status tersebut tidak bisa login dan semua refresh token dicabut |
| AUTH-05 | Reset password | Could | 3 | Tautan sekali pakai dengan batas waktu; bergantung pada penyedia email |
| AUTH-06 | Hapus akun | Should | 3 | User menghapus akunnya; data diperlakukan sesuai BR-06 |

### Feed dan post

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| POST-01 | Buat post teks | Must | 1 | Maksimal 5.000 karakter; teks kosong ditolak; melewati filter kata terlarang |
| POST-02 | Lampirkan foto | Must | 1 | JPG, PNG, atau WebP maksimal 5 MB; satu foto per post |
| POST-03 | Privasi per post | Must | 1 | Pilihan Public, Friends, Only me; diperiksa di server pada setiap query |
| POST-04 | News feed | Must | 1 | Post teman dan sendiri, terbaru di atas, 10 per halaman, infinite scroll |
| POST-05 | Edit post | Must | 1 | Hanya pemilik; post ditandai sudah diedit |
| POST-06 | Hapus post | Must | 1 | Soft delete; komentar dan like ikut tidak tampil |
| POST-07 | Share post | Must | 1 | Membuat post baru yang merujuk post asal; jika asal dihapus tampil sebagai tidak tersedia |
| POST-08 | Feeling atau aktivitas | Could | 2 | Pilih dari daftar tetap, tampil di samping nama |
| POST-09 | Sort feed | Should | 2 | Dropdown Most Recent atau Top Stories (urut jumlah like) |
| POST-10 | Hashtag | Should | 2 | Teks berawalan # dikenali dan dihitung untuk trending |

### Interaksi

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| INT-01 | Like dan Unlike post | Must | 1 | Satu like per user per post; ringkasan seperti "A, B, and 3 others like this" |
| INT-02 | Komentar | Must | 1 | Urut lama ke baru; maksimal 2.000 karakter; dihapus oleh pemilik komentar atau pemilik post |
| INT-03 | Like komentar | Should | 1 | Satu like per user per komentar |
| INT-04 | Laporkan konten | Must | 2 | Tombol Report pada post, komentar, dan profil; alasan dipilih; masuk antrean admin |
| INT-05 | Foto di komentar | Could | 3 | Ikon kamera melampirkan satu foto |

### Profil

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| PRF-01 | Halaman profil | Must | 1 | Cover, foto profil, nama, bio, tab Timeline, About, Friends (dengan jumlah), Photos, More |
| PRF-02 | Edit profil | Must | 1 | Nama tampil, bio, kota asal, kota tinggal, tempat kerja atau sekolah, tanggal lahir |
| PRF-03 | Unggah foto profil dan cover | Must | 1 | Validasi tipe dan ukuran; foto lama tetap tersimpan |
| PRF-04 | Kartu info dan grid teman | Should | 1 | Kartu Studied at, Lives in, From, Born; grid enam teman |
| PRF-05 | Scroller tahun | Should | 2 | Panel menempel di kanan timeline; klik melompat ke post tahun itu |
| PRF-06 | Pengaturan privasi profil | Should | 3 | Atur siapa yang melihat info, daftar teman, dan post baru |

### Pertemanan

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| FRD-01 | Kirim permintaan teman | Must | 1 | Tidak bisa ke diri sendiri, ke yang sudah teman, atau ke yang memblokir |
| FRD-02 | Terima, tolak, batalkan | Must | 1 | Status berubah dan terlihat di profil kedua pihak |
| FRD-03 | Unfriend | Must | 1 | Hubungan dihapus untuk kedua arah |
| FRD-04 | Daftar teman | Must | 1 | Tab Friends dengan jumlah dan paginasi |
| FRD-05 | People You May Know | Should | 2 | Berdasarkan jumlah teman bersama; tidak menampilkan yang sudah teman atau diblokir |
| FRD-06 | Block user | Should | 3 | Sesuai BR-11 |
| FRD-07 | Birthday reminder | Could | 2 | Kartu di sidebar menampilkan ulang tahun teman hari ini |

### Notifikasi, chat, dan poke

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| NTF-01 | Notifikasi | Must | 2 | Like, komentar, permintaan teman, teman diterima, poke, tag, wall post, pengumuman; tanpa notifikasi untuk aksi sendiri |
| NTF-02 | Jewel dengan badge | Must | 2 | Badge angka belum dibaca diperbarui realtime; membuka dropdown menandai terbaca |
| CHT-01 | Pesan 1-ke-1 | Must | 2 | Realtime; riwayat tersimpan dan dapat dimuat ulang |
| CHT-02 | Chat sidebar dan presence | Must | 2 | Daftar teman penuh tinggi, titik hijau online, label Web atau Mobile |
| CHT-03 | Chat dock | Should | 2 | Jendela chat kecil di dasar layar, maksimal tiga terbuka |
| CHT-04 | Indikator mengetik dan terbaca | Should | 2 | Tampil realtime di jendela chat |
| POK-01 | Poke | Should | 2 | Satu poke aktif per pasangan sampai dilihat atau dibalas; memicu notifikasi |

### Pencarian, dinding, dan tag

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| SRC-01 | Cari orang | Must | 2 | Berdasarkan nama atau username; maksimal 8 hasil di dropdown; menghormati blokir |
| SRC-02 | Trending topics | Should | 2 | Hashtag terbanyak 24 jam terakhir di kolom kanan |
| WAL-01 | Wall post | Should | 2 | Teman menulis di dinding; tampil dengan judul Nama ke Nama (sesuai UI referensi) |
| WAL-02 | Tag teman | Should | 2 | Ketik @ memilih teman; yang di-tag mendapat notifikasi |

### Fase 3 dan bonus

| ID | Kebutuhan | Prioritas | Fase | Kriteria penerimaan |
|---|---|---|---|---|
| ALB-01 | Album foto | Could | 3 | Buat album, unggah beberapa foto, tampil di tab Photos |
| GRP-01 | Grup sederhana | Could | 3 | Buat, gabung, posting; kartu Suggested groups dengan tombol Join |
| EVT-01 | Event dan RSVP | Could | 3 | Going, Maybe, Can't go; kartu Events today |
| NOT-01 | Notes | Could | 3 | Catatan panjang di tab Notes |
| LIF-01 | Life Event | Could | 3 | Milestone sederhana tampil di timeline |
| ACT-01 | Activity Log | Could | 3 | Daftar aktivitas sendiri dengan opsi hapus |
| BOT-01 | Bot AI sebagai teman | Could | Bonus | Akun bot memposting dan membalas komentar; sesuai BR-09 |
| THM-01 | Tema Time Travel | Could | Bonus | Pengalih tema 2010, 2015, 2020 lewat design token |
| SPN-01 | Sponsored | Could | Bonus | Kotak promosi internal yang dikelola admin |

## 6. Kebutuhan fungsional: admin panel

Admin panel adalah aplikasi terpisah yang memakai API yang sama; semua aksi tulis admin wajib masuk audit log (ADM-14).

| ID | Kebutuhan | Prioritas | Kriteria penerimaan |
|---|---|---|---|
| ADM-01 | Login admin | Must | Hanya role ADMIN; user biasa ditolak; admin pertama dibuat lewat seed atau CLI |
| ADM-02 | Dashboard | Must | Kartu total user, post, komentar, user aktif hari ini, pendaftar 7 hari, laporan pending; grafik pendaftaran dan post per hari |
| ADM-03 | Daftar user | Must | Search, filter status dan role, paginasi |
| ADM-04 | Suspend, ban, aktifkan user | Must | Status berubah; sesi dicabut; tercatat di audit log |
| ADM-05 | Hapus user | Should | Konfirmasi dua langkah; mengikuti BR-06 |
| ADM-06 | Reset password user | Should | Password sementara atau tautan reset; tercatat |
| ADM-07 | Ubah role | Should | USER dan ADMIN; admin tidak bisa menurunkan dirinya sendiri jika ia admin terakhir |
| ADM-08 | Moderasi post | Must | Daftar dengan filter (disembunyikan, dilaporkan, tanggal); sembunyikan, tampilkan lagi, hapus |
| ADM-09 | Moderasi komentar | Must | Sama seperti post; aksi massal untuk beberapa komentar |
| ADM-10 | Antrean laporan | Must | Status pending, reviewed, dismissed; aksi cepat hapus konten, peringatkan user, atau abaikan |
| ADM-11 | Kata terlarang | Should | Tambah dan hapus kata; konten yang memuat kata ditandai otomatis (BR-08) |
| ADM-12 | Pengaturan sistem | Should | Maintenance mode dan buka atau tutup pendaftaran; berlaku tanpa deploy ulang |
| ADM-13 | Pengumuman | Should | Tampil sebagai notifikasi dan banner di feed |
| ADM-14 | Audit log | Must | Siapa, kapan, aksi, target; tidak bisa diubah atau dihapus; bisa difilter per admin dan aksi |
| ADM-15 | Kelola bot AI | Could | Aktifkan atau nonaktifkan bot, atur persona dan frekuensi |
| ADM-16 | Kelola Sponsored | Could | Buat, jadwalkan, dan nonaktifkan promosi internal |
| ADM-17 | Kelola trending | Could | Sembunyikan hashtag tertentu dari daftar trending |

## 7. Kebutuhan non-fungsional

Kebutuhan ini berlaku untuk semua fitur; angka adalah target usulan untuk lingkungan pengembangan dan demo, bukan SLA produksi.

| Kategori | Kebutuhan | Ukuran |
|---|---|---|
| Performa | Respons baca API cepat pada data seed | p95 di bawah 300 ms untuk 30 user dan 200 post di mesin dev |
| Performa | Feed memuat bertahap | 10 post per halaman dengan cursor pagination |
| Keamanan | Password disimpan sebagai hash | argon2 atau bcrypt; tidak pernah ada di respons API |
| Keamanan | Otorisasi di sisi server | Privasi dan blokir diperiksa di setiap query, bukan di frontend |
| Keamanan | Perlindungan penyalahgunaan | Rate limiting pada login, register, pesan, dan poke |
| Keamanan | Input dan upload aman | Validasi DTO, anti XSS, batas tipe dan ukuran file, periksa isi file |
| Privasi | Data pengguna minimal | Hanya data yang dibutuhkan; halaman kebijakan privasi; cara menghapus akun |
| Ketersediaan | Satu instance cukup | Tanpa target uptime; backup MySQL berkala bila data nyata sudah ada |
| Kompatibilitas | Browser | Chrome, Firefox, Safari, dan Edge versi terbaru |
| Kompatibilitas | Layar | Utama desktop 1024 px ke atas; satu breakpoint di sekitar 900 px menyembunyikan kolom samping |
| Aksesibilitas | Dasar | Form dan dropdown bisa dipakai dengan keyboard; teks punya kontras cukup; gambar punya teks alternatif |
| Kualitas kode | Tes otomatis | Unit untuk logika privasi, pertemanan, dan guard; e2e untuk alur utama |
| Observabilitas | Log dan error | Log terstruktur; format error seragam statusCode, message, code |
| Operasional | Konfigurasi | Variabel lingkungan per aplikasi; rahasia tidak masuk git |

## 8. Aturan bisnis, privasi, dan moderasi

Aturan ini adalah sumber kebenaran untuk logika server dan tes otomatis; setiap aturan harus punya minimal satu tes.

| ID | Aturan |
|---|---|
| BR-01 | Pertemanan bersifat dua arah: hubungan berstatus ACCEPTED berlaku untuk kedua pihak dan disimpan sebagai satu baris per pasangan. |
| BR-02 | Aplikasi tertutup: semua konten hanya terlihat setelah login. Public berarti terlihat oleh semua member yang login. |
| BR-03 | Friends berarti hanya teman berstatus ACCEPTED; Only me berarti penulis saja, ditambah admin untuk keperluan moderasi. |
| BR-04 | Wall post terlihat oleh teman pemilik dinding dan teman penulis; pemilik dinding dapat menghapusnya dari dindingnya. |
| BR-05 | SUSPENDED: tidak bisa login, konten tetap tampil. BANNED: tidak bisa login dan konten disembunyikan dari semua kecuali admin. |
| BR-06 | Hapus akun: konten di-soft delete dan data pribadi dianonimkan setelah masa tunggu (usulan 30 hari, lihat pertanyaan terbuka). |
| BR-07 | Konten yang disembunyikan admin tidak tampil kecuali kepada admin dan pemiliknya; setiap hide, hapus, dan perubahan status user masuk audit log. |
| BR-08 | Kata terlarang tidak memblokir pengiriman; konten yang memuatnya ditandai dan masuk antrean moderasi. |
| BR-09 | Akun bot ditandai isBot, tidak bisa login, konten melewati filter yang sama, dan tidak dihitung dalam statistik user aktif. |
| BR-10 | Batas laju: login, register, pesan, dan poke dibatasi per user dan per alamat IP. |
| BR-11 | Block: pemblokir dan yang diblokir tidak saling melihat profil, post, atau hasil pencarian, dan tidak bisa chat, poke, atau mengirim permintaan teman. |
| BR-12 | Maintenance mode: hanya admin yang dapat login; pengguna lain melihat halaman pemeliharaan. |
| BR-13 | Hanya ada satu jenis reaksi, yaitu Like, sesuai era 2015. |
| BR-14 | Hanya admin terakhir yang tidak bisa dihapus, dinonaktifkan, atau diturunkan rolenya. |

## 9. Kebutuhan UI dan UX

Tampilan mengikuti empat tangkapan layar referensi (feed 2014, profil Maret 2015, halaman login, dan satu pembanding bergaya 2019 yang tidak dijadikan target); nilai warna dan ukuran piksel diukur dari referensi dan dikunci sebagai design token.

| ID | Kebutuhan | Catatan |
|---|---|---|
| UX-01 | Navbar biru menempel di atas dengan kotak pencarian, nama dan foto pengguna, Home, dan tiga jewels dengan badge merah | Referensi feed dan profil |
| UX-02 | Layout tiga kolom: sidebar kiri bergrup, feed di tengah, kolom kanan berisi kartu dan daftar chat | Lebar konten sekitar 980 px |
| UX-03 | Kartu putih datar dengan border tipis dan sudut hampir kotak | Tanpa bayangan tebal |
| UX-04 | Aksi post berupa link teks Like dan Comment, berubah menjadi Unlike | Bukan tombol ikon besar |
| UX-05 | Profil dengan cover, foto profil persegi menumpuk di kiri bawah, nama putih di atas cover, tab, kartu info, grid teman, dan scroller tahun | Referensi profil Maret 2015 |
| UX-06 | Composer dengan tab Status, Photo / Video, Life Event | Life Event menunggu Fase 3 |
| UX-07 | Daftar chat penuh tinggi dengan titik hijau dan label Web atau Mobile; dock chat di dasar layar | Maksimal tiga jendela |
| UX-08 | Halaman login: header biru dengan kolom login, tagline berikon di kiri, formulir Sign Up dengan tombol hijau | Susunan saja; nama, logo, dan ikon buatan sendiri |
| UX-09 | Semua warna, jarak, dan font dibaca dari satu set design token | Memungkinkan tema Time Travel |
| UX-10 | Tanpa UI kit pihak ketiga; CSS ditulis tangan | Agar terasa autentik dan ringan |
| UX-11 | Satu breakpoint sederhana di sekitar 900 px menyembunyikan kolom samping | Agar terbuka di ponsel |
| UX-12 | Label parodi di footer dan halaman register; tanpa nama, logo, atau aset merek asli | Lihat bagian aturan dan risiko |

## 10. Asumsi, dependensi, dan risiko

Risiko terbesar adalah scope yang melebar dan menyita waktu Insell, bukan kesulitan teknis.

Asumsi:

- Dikerjakan sendiri secara paruh waktu, sekitar 10 minggu.
- Berjalan di satu instance; belum ada kebutuhan Redis atau penskalaan horizontal.
- Awalnya demo lokal dan konten; pembukaan ke publik adalah keputusan terpisah.

Dependensi:

- Node.js, PNPM, MySQL, dan Docker untuk pengembangan lokal.
- Penyimpanan file: disk lokal dahulu, lalu penyimpanan S3-compatible saat deploy.
- Penyedia email (hanya jika reset password dikerjakan) dan penyedia model bahasa (hanya jika bot AI dikerjakan); keduanya belum dipilih.
- Dokumen pendamping: Roadmap Lengkap dan ERD.

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R-01 | Scope creep | Proyek tidak selesai | Kunci Fase 1 sebagai target; Fase 3 dan bonus hanya bila waktu sisa |
| R-02 | Bersaing waktu dengan Insell | Fokus terpecah | Blok waktu tetap per minggu; pakai pola yang sama agar ada transfer ilmu |
| R-03 | Aturan privasi keliru | Konten bocor ke orang yang tidak berhak | Tes otomatis untuk setiap aturan BR; pemeriksaan di server |
| R-04 | Konten buruk dari user | Beban moderasi | Report, kata terlarang, dan alat admin selesai sebelum dibuka ke publik |
| R-05 | Dikira situs asli | Masalah merek dan kepercayaan | Nama dan logo sendiri, label parodi, tanpa halaman login tiruan |
| R-06 | Realtime membebani server | Chat dan notifikasi lambat | Satu instance dahulu; Redis adapter hanya bila perlu |
| R-07 | Nilai visual 2015 meleset | UI terasa tidak autentik | Ukur dari tangkapan layar referensi dan kunci sebagai token sejak minggu 1 |

## 11. Rilis dan milestone

Empat rilis internal mengikuti roadmap mingguan; tanggal kalender menunggu tanggal mulai ditetapkan.

| Rilis | Isi | Target | Kriteria rilis |
|---|---|---|---|
| R1: Fase 1 | Akun, feed, like, komentar, share, profil, pertemanan | Akhir minggu 4 | Semua FR Must Fase 1 lulus; e2e alur utama hijau; demo direkam |
| R2: Fase 2 | Notifikasi, chat, poke, wall, tag, pencarian, trending, tombol Report | Akhir minggu 7 | Semua FR Must dan Should Fase 2 lulus; realtime stabil pada dua browser |
| R3: Admin | Dashboard, manajemen user, moderasi, laporan, pengaturan, audit log | Akhir minggu 9 | Semua FR Must admin lulus; alur laporan end-to-end tercatat di audit log |
| R4: Final | Seeder, bot AI, satu atau dua fitur Fase 3, hardening, deploy | Akhir minggu 10 | Checklist keamanan selesai; Docker Compose produksi jalan; README dan demo siap |

## 12. Pertanyaan terbuka dan glosarium

Pertanyaan terbuka berikut perlu diputuskan sebelum bagian terkait dikerjakan.

- Nama final dan logo aplikasi
- Bahasa antarmuka: Inggris seperti era aslinya, atau Indonesia
- Hanya demo lokal dan konten, atau dibuka untuk publik
- Masa tunggu anonimisasi setelah hapus akun (usulan 30 hari)
- Rumus Top Stories pada Sort feed (usulan: urut jumlah like)
- Penyedia email untuk reset password
- Penyedia model bahasa untuk bot AI
- Penyimpanan file produksi: disk lokal atau S3-compatible

| Istilah | Arti |
|---|---|
| Jewels | Tiga ikon di navbar (teman, pesan, notifikasi) dengan badge angka |
| News feed | Daftar post teman dan diri sendiri di halaman utama |
| Timeline | Halaman profil berisi post milik seseorang, dengan scroller tahun |
| Wall post | Post yang ditulis teman di dinding pemilik profil |
| Poke | Sapaan singkat tanpa isi pesan |
| Soft delete | Data ditandai terhapus (deletedAt) tetapi tetap tersimpan |
| MoSCoW | Prioritas: Must, Should, Could |
| FR, BR, NFR | Functional requirement, business rule, non-functional requirement |
