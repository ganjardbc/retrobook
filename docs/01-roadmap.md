# Roadmap Lengkap: Retro Social Network 2015 + Admin Panel

Dibuat 2026-11-24 · Ganjar Hadiatna

## Ringkasan & tujuan

Proyek ini adalah jejaring sosial parodi dengan tampilan era 2015, lengkap dengan admin panel, dibangun di stack yang sama dengan Insell supaya pola kodenya bisa dipakai ulang.

- Tujuan: fun project untuk melatih frontend, auth, relasi data, realtime, dan moderasi, sekaligus bahan konten Coderium.

- Hasil: tiga aplikasi dalam satu monorepo (user app, admin panel, API) dengan data dummy yang membuat feed terasa hidup.

- Definisi selesai: user bisa daftar, posting, berteman, chat, dan menerima notifikasi; admin bisa melihat statistik, memoderasi konten, dan menangani laporan.

- Perkiraan waktu: sekitar 10 minggu paruh waktu, dengan akhir Fase 1 sebagai titik berhenti yang sudah layak dipamerkan.

## Prinsip & batasan

Proyek ini aman dan tetap seru selama diposisikan sebagai parodi dengan identitas sendiri, bukan tiruan yang bisa dikira situs asli.

- Nama, logo, dan teks: jangan memakai nama, logo, atau kata "facebook". Pakai nama sendiri (contoh: Wajahbuku atau Facebuk '15) dan logo buatan sendiri.

- Tanpa halaman login tiruan: jangan membuat halaman yang meniru login atau domain platform asli, dan jangan dipakai untuk mengumpulkan kredensial siapa pun.

- Label parodi: tampilkan keterangan "fun project / parodi" di footer dan halaman register.

- Data pengguna: jika dibuka ke publik, tampilkan kebijakan privasi singkat dan jangan minta data sensitif yang tidak perlu.

- Fokus: ini fun project. Fase 1 harus selesai sebelum Fase 2 dimulai, supaya tidak menyaingi waktu untuk Insell.

- Keputusan 2015: hanya tombol Like (reactions baru muncul 2016), tanpa Stories, tanpa algoritma feed; urutan feed berdasarkan waktu.

## Arsitektur & stack

Stack mengikuti Insell (Vue 3, Vite, NestJS, Prisma, MySQL, PNPM monorepo); dua frontend memanggil satu API NestJS yang berbicara ke MySQL dan WebSocket.

| Lapisan     | Pilihan                         | Catatan                                                    |
|-------------|---------------------------------|------------------------------------------------------------|
| User app    | Vue 3 + Vite, Vue Router, Pinia | CSS/SCSS tulis tangan, tanpa UI kit supaya terasa autentik |
| Admin panel | Vue 3 + Vite + PrimeVue         | Tabel, filter, dialog (PrimeVue); grafik sederhana         |
| API         | NestJS                          | Satu modul per domain, guard JWT dan guard role            |
| Database    | MySQL + Prisma                  | Migrasi lewat Prisma Migrate                               |
| Realtime    | Socket.IO (NestJS Gateway)      | Chat, notifikasi, presence                                 |
| Auth        | JWT access + refresh token      | Password di-hash dengan argon2 atau bcrypt                 |
| Upload      | Multer ke disk lokal            | Pindah ke penyimpanan S3-compatible saat deploy            |
| Monorepo    | PNPM workspaces                 | Tipe dan konstanta dibagi lewat packages/shared            |
| Test        | Vitest, Jest, Playwright        | Unit di web dan api, e2e untuk alur utama                  |
| Deploy      | Docker Compose                  | web, admin, api, mysql dalam satu compose                  |

```text
 apps/web (Vue 3)      apps/admin (Vue 3)
        \                   /
         \                 /
        apps/api (NestJS + Socket.IO)
            /            \
        MySQL         uploads (disk lokal → S3-compatible)
```
*Arsitektur: 2 frontend, 1 API, 2 penyimpanan.*

User app dan admin panel memakai API yang sama; route `/admin/*` dibatasi RolesGuard, dan `packages/db` serta `packages/shared` dipakai bersama oleh semua aplikasi.

## Struktur monorepo

Satu repo berisi tiga aplikasi dan dua paket bersama, sehingga schema, tipe, dan konstanta cukup ditulis sekali.

``` text
retro-social/
├─ apps/
│  ├─ web/            # user app (Vue 3 + Vite)
│  │  └─ src/
│  │     ├─ views/    # Feed, Profile, Friends, Messages, Notifications, Search, Settings
│  │     ├─ components/ # Navbar, PostCard, StatusBox, ChatDock, JewelMenu
│  │     ├─ stores/   # auth, feed, friends, chat, notifications
│  │     ├─ styles/   # tokens.scss, base.scss, components/
│  │     └─ api/      # client HTTP + socket
│  ├─ admin/          # admin panel (Vue 3 + Vite)
│  │  └─ src/views/   # Dashboard, Users, Posts, Reports, Settings, AuditLog, Announcements
│  └─ api/            # NestJS
│     └─ src/modules/ # auth, users, posts, comments, likes, friends, pokes,
│                     # messages, notifications, search, uploads,
│                     # reports, admin, settings, audit, announcements, bots
├─ packages/
│  ├─ db/             # schema.prisma, migrations, seed.ts, PrismaClient
│  └─ shared/         # tipe DTO, enum (Role, Privacy, ReportReason), konstanta
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ README.md
```

Aturan kerja: apps hanya boleh mengimpor dari packages, tidak antar-apps; admin dan user app berbagi API yang sama, dengan route admin dilindungi RolesGuard.

## Model data (Prisma)

Schema di bawah adalah sketsa awal untuk semua fase (relasi balik Prisma dilengkapi saat migrasi pertama); model Fase 3 (Album, Group, Event, Note) boleh ditunda sampai fitur itu dikerjakan.

``` prisma
enum Role { USER ADMIN }
enum UserStatus { ACTIVE SUSPENDED BANNED }
enum Privacy { PUBLIC FRIENDS ONLY_ME }
enum FriendStatus { PENDING ACCEPTED }
enum NotifType { LIKE COMMENT FRIEND_REQUEST FRIEND_ACCEPT POKE TAG WALL_POST ANNOUNCEMENT }
enum ReportTarget { POST COMMENT USER }
enum ReportReason { SPAM HARASSMENT INAPPROPRIATE OTHER }
enum ReportStatus { PENDING REVIEWED DISMISSED }

model User {
  id           Int        @id @default(autoincrement())
  email        String     @unique
  username     String     @unique
  displayName  String
  passwordHash String
  role         Role       @default(USER)
  status       UserStatus @default(ACTIVE)
  isBot        Boolean    @default(false)
  bio          String?    @db.Text
  avatarUrl    String?
  coverUrl     String?
  birthday     DateTime?
  hometown     String?
  workplace    String?
  lastSeenAt   DateTime?
  createdAt    DateTime   @default(now())
  posts        Post[]     @relation("PostAuthor")
  wallPosts    Post[]     @relation("WallOwner")
  comments     Comment[]
  likes        Like[]
  tokens       RefreshToken[]
}

model RefreshToken {
  id        Int      @id @default(autoincrement())
  userId    Int
  tokenHash String   @unique
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id          Int       @id @default(autoincrement())
  authorId    Int
  wallOwnerId Int?      // terisi jika menulis di dinding teman
  content     String    @db.Text
  imageUrl    String?
  feeling     String?   // contoh: "feeling happy"
  privacy     Privacy   @default(FRIENDS)
  sharedFromId Int?     // untuk fitur share
  hidden      Boolean   @default(false) // disembunyikan oleh admin
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?
  author      User      @relation("PostAuthor", fields: [authorId], references: [id])
  wallOwner   User?     @relation("WallOwner", fields: [wallOwnerId], references: [id])
  comments    Comment[]
  likes       Like[]
  tags        PostTag[]
  @@index([authorId, createdAt])
}

model PostTag {
  postId Int
  userId Int
  @@id([postId, userId])
}

model Comment {
  id        Int       @id @default(autoincrement())
  postId    Int
  authorId  Int
  content   String    @db.Text
  hidden    Boolean   @default(false)
  createdAt DateTime  @default(now())
  deletedAt DateTime?
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  author    User      @relation(fields: [authorId], references: [id])
  likes     Like[]
}

model Like {
  id        Int      @id @default(autoincrement())
  userId    Int
  postId    Int?
  commentId Int?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  post      Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  comment   Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  @@unique([userId, postId])
  @@unique([userId, commentId])
}

model Friendship {
  id          Int          @id @default(autoincrement())
  requesterId Int
  addresseeId Int
  status      FriendStatus @default(PENDING)
  createdAt   DateTime     @default(now())
  @@unique([requesterId, addresseeId])
}

model Poke {
  id        Int      @id @default(autoincrement())
  fromId    Int
  toId      Int
  seenAt    DateTime?
  createdAt DateTime @default(now())
}

model Message {
  id         Int       @id @default(autoincrement())
  senderId   Int
  receiverId Int
  content    String    @db.Text
  readAt     DateTime?
  createdAt  DateTime  @default(now())
  @@index([senderId, receiverId, createdAt])
}

model Notification {
  id        Int       @id @default(autoincrement())
  userId    Int       // penerima
  actorId   Int?
  type      NotifType
  postId    Int?
  readAt    DateTime?
  createdAt DateTime  @default(now())
  @@index([userId, readAt])
}

model Report {
  id         Int          @id @default(autoincrement())
  reporterId Int
  targetType ReportTarget
  targetId   Int
  reason     ReportReason
  note       String?      @db.Text
  status     ReportStatus @default(PENDING)
  handledBy  Int?
  handledAt  DateTime?
  createdAt  DateTime     @default(now())
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  adminId   Int
  action    String   // contoh: USER_SUSPEND, POST_HIDE
  targetType String?
  targetId  Int?
  detail    Json?
  createdAt DateTime @default(now())
}

model Setting {
  key   String @id   // maintenance_mode, registration_open, ...
  value Json
}

model Announcement {
  id        Int      @id @default(autoincrement())
  title     String
  body      String   @db.Text
  createdBy Int
  createdAt DateTime @default(now())
}

model BlockedWord {
  id   Int    @id @default(autoincrement())
  word String @unique
}

// Fase 3 (tunda sampai dikerjakan): Album, Photo, Group, GroupMember, Event, EventRsvp, Note
```

Catatan desain: penghapusan memakai soft delete (`deletedAt`) agar moderasi bisa dilacak; `hidden` dipakai admin untuk menyembunyikan tanpa menghapus.

## Fitur user app

Fitur dibagi tiga fase plus bonus; Fase 1 sudah cukup untuk dipamerkan, Fase 2 memberi nuansa 2015, Fase 3 melengkapi.

### Fase 1: Inti (MVP)

| Fitur                   | Kriteria selesai                                                                                           |
|-------------------------|------------------------------------------------------------------------------------------------------------|
| Register, login, logout | Validasi email dan username unik, JWT access + refresh, logout menghapus refresh token                     |
| Navbar biru + jewels    | Ikon friend requests, messages, notifications dengan badge angka; kotak pencarian di tengah                |
| News feed               | Post teman + post sendiri, urut waktu, infinite scroll 10 post per halaman                                 |
| Status box              | Tulis teks, lampirkan 1 foto, pilih privasi (Public, Friends, Only me)                                     |
| Like, comment, share    | Like toggle, komentar berurutan, share membuat post baru yang merujuk post asal                            |
| Profil + timeline       | Foto profil, cover, bio, kartu info (Studied at, Lives in, From, Born), grid teman, daftar post milik user |
| Friend system           | Kirim, terima, tolak, batalkan, dan unfriend; status terlihat di profil                                    |
| Edit dan hapus post     | Hanya pemilik; hapus memakai soft delete                                                                   |

### Fase 2: Ciri khas 2015

| Fitur               | Kriteria selesai                                                                                                                               |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Notifikasi          | Dropdown jewel menampilkan like, comment, friend request; klik menandai terbaca                                                                |
| Chat sidebar + dock | Daftar teman penuh tinggi di kanan dengan titik hijau dan label Web atau Mobile, jendela chat kecil di dasar layar, maksimal 3 jendela terbuka |
| Poke                | Tombol Poke di profil; penerima mendapat notifikasi dan bisa poke balik                                                                        |
| Wall post           | Teman bisa menulis di dinding; tampil di timeline pemilik dengan judul Nama ▸ Nama                                                             |
| Tag teman           | Ketik @ untuk memilih teman; yang di-tag mendapat notifikasi                                                                                   |
| Search              | Cari orang berdasarkan nama atau username dengan hasil dropdown                                                                                |
| People You May Know | Saran berdasarkan teman bersama                                                                                                                |
| Trending topics     | Hashtag terbanyak 24 jam terakhir di sidebar kanan                                                                                             |
| Birthday reminder   | Kotak di sidebar menampilkan ulang tahun teman hari ini                                                                                        |

### Fase 3: Pelengkap

| Fitur            | Kriteria selesai                                                                             |
|------------------|----------------------------------------------------------------------------------------------|
| Album foto       | Buat album, unggah beberapa foto, tampil di tab Photos profil                                |
| Groups sederhana | Buat grup, gabung, posting di grup; kartu Suggested groups dengan tombol Join di kolom kanan |
| Events           | Buat event, RSVP Going, Maybe, Can't go                                                      |
| Notes            | Tulis catatan panjang di tab Notes                                                           |
| Privacy setting  | Atur siapa yang bisa melihat profil, daftar teman, dan post baru                             |
| Block user       | User yang diblokir tidak bisa melihat atau menghubungi pemblokir                             |

### Bonus

| Fitur                | Kriteria selesai                                                        |
|----------------------|-------------------------------------------------------------------------|
| Bot AI sebagai teman | Beberapa akun bot memposting dan membalas komentar agar feed tidak sepi |
| Time Travel          | Pengalih tema (2010, 2015, 2020) lewat token CSS                        |
| Seeder data dummy    | Satu perintah membuat puluhan user, post, dan komentar acak             |
| Reactions            | Sengaja tidak dibuat; di 2015 hanya ada Like                            |

### Tambahan dari referensi UI

Fitur berikut muncul di tangkapan layar referensi (feed 2014, profil Maret 2015) dan belum ada di daftar awal.

| Fitur                | Fase  | Kriteria selesai                                                                                                                         |
|----------------------|-------|------------------------------------------------------------------------------------------------------------------------------------------|
| Sort feed            | 2     | Dropdown Sort di atas feed: Most Recent atau Top Stories (urut jumlah like)                                                              |
| Tab composer         | 2     | Tiga tab: Status, Photo / Video, Life Event                                                                                              |
| Life Event           | 3     | Milestone sederhana (pindah kota, mulai kerja, lulus) yang tampil di timeline                                                            |
| Scroller tahun       | 2     | Panel menempel di kanan timeline: Recent, tahun-tahun, Born; klik melompat ke post tahun itu                                             |
| Activity Log         | 3     | Halaman daftar aktivitas sendiri (post, like, komentar) dengan opsi hapus                                                                |
| Menu sidebar kiri    | 1     | Bagian Favorites, Pages, Groups, Friends, Apps dengan ikon kecil dan angka belum dibaca; item yang butuh fitur Fase 3 disembunyikan dulu |
| Kartu "Events today" | 3     | Tautan jumlah event hari ini di kolom kanan, bergantung pada fitur Events                                                                |
| Foto di komentar     | 3     | Ikon kamera di kolom komentar untuk melampirkan satu foto                                                                                |
| Sponsored            | Bonus | Kotak promosi internal di kolom kanan dengan label Sponsored, dikelola dari admin panel                                                  |

## Fitur admin panel

Admin panel adalah aplikasi terpisah (apps/admin) yang memakai API yang sama dengan route `/admin/*`, dilindungi RolesGuard (`role = ADMIN`) dan setiap aksi tercatat di audit log.

| Modul             | Fitur                                                                                   | Kriteria selesai                                                     |
|-------------------|-----------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| Dashboard         | Total user, post, komentar, user aktif hari ini, pendaftar baru 7 hari, laporan pending | Angka tampil dalam kartu; grafik garis pendaftaran dan post per hari |
| Manajemen user    | Daftar dengan search, filter status dan role, paginasi                                  | Aksi suspend, ban, aktifkan, hapus, reset password, ubah role        |
| Detail user       | Profil, jumlah post, teman, laporan terhadap user                                       | Riwayat aksi admin pada user tersebut                                |
| Moderasi post     | Daftar semua post dengan filter (disembunyikan, dilaporkan, tanggal)                    | Sembunyikan, tampilkan lagi, atau hapus; konten asli tetap tersimpan |
| Moderasi komentar | Sama seperti post                                                                       | Aksi massal untuk beberapa komentar sekaligus                        |
| Laporan           | Antrean laporan dengan status pending, reviewed, dismissed                              | Satu klik: hapus konten, peringatkan user, atau abaikan laporan      |
| Kata terlarang    | Kelola daftar kata                                                                      | Post atau komentar yang memuat kata tersebut otomatis ditandai       |
| Pengaturan sistem | Maintenance mode, buka atau tutup pendaftaran, kelola trending                          | Perubahan langsung berlaku tanpa deploy ulang                        |
| Pengumuman        | Tulis pengumuman untuk semua user                                                       | Muncul sebagai notifikasi dan banner di feed                         |
| Audit log         | Siapa, kapan, aksi, target                                                              | Tidak bisa diedit atau dihapus; bisa difilter per admin dan per aksi |
| Kelola bot AI     | Aktif atau nonaktifkan bot, atur persona dan frekuensi posting                          | Bot tampil sebagai user biasa dengan penanda internal `isBot`        |

Tampilan admin sengaja dibuat sederhana dan jadul (tabel, tab, tombol abu-abu) agar sejiwa dengan user app. Admin pertama dibuat lewat seed atau perintah CLI, bukan lewat form registrasi.

## Spesifikasi UI 2015

Kesan 2015 datang dari bar biru, kartu putih datar dengan border tipis, dan teks kecil yang padat. Tata letak di bawah sudah dicocokkan dengan tiga tangkapan layar referensi (feed 2014, profil Maret 2015, halaman login); nilai warna dan ukuran piksel masih perkiraan sampai diukur dari referensi dan dikunci sebagai design token.

| Elemen             | Spesifikasi awal                                                                                                                                                                                                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Warna navbar       | Biru tua sekitar `#3b5998`, tinggi sekitar 42 px, menempel di atas                                                                                                                                                                                                                                |
| Background halaman | Abu-abu muda sekitar `#e9ebee`                                                                                                                                                                                                                                                                    |
| Kartu              | Putih, border 1 px abu-abu terang (`#dddfe2`), sudut hampir kotak (radius 3 px), tanpa bayangan tebal                                                                                                                                                                                             |
| Link dan nama      | Biru sekitar `#365899`, tanpa garis bawah, garis bawah saat hover                                                                                                                                                                                                                                 |
| Teks               | Hitam kebiruan (`#1d2129`), teks sekunder abu-abu (`#90949c`)                                                                                                                                                                                                                                     |
| Font               | Helvetica, Arial, sans-serif; 12 px untuk sidebar dan meta, 14 px untuk isi post                                                                                                                                                                                                                  |
| Tombol utama       | Biru solid dengan teks putih tebal, sudut 2 px; tombol sekunder abu-abu terang dengan border                                                                                                                                                                                                      |
| Layout             | Lebar konten sekitar 980 px di tengah; tiga kolom: sidebar kiri (~180 px, menu bergrup Favorites, Pages, Groups, Friends, Apps), feed (~500 px), kolom kanan (~300 px, kartu rekomendasi dan daftar chat penuh tinggi)                                                                            |
| Aksi post          | Teks link berjajar: Like · Comment · Share, bukan tombol ikon besar; setelah di-like berubah jadi Unlike, dan post di dinding teman memakai judul Nama ▸ Nama                                                                                                                                     |
| Jewels             | Tiga ikon di navbar (teman, pesan, notifikasi) dengan lencana angka merah; klik membuka dropdown putih                                                                                                                                                                                            |
| Profil             | Cover lebar penuh (sekitar 315 px tinggi), foto profil persegi menumpuk di kiri bawah cover, nama putih di atas cover, tab Timeline, About, Friends (dengan jumlah), Photos, More, tombol Update Info dan View Activity Log, kolom kiri berisi kartu info dan grid teman, scroller tahun di kanan |
| Chat dock          | Bar tipis di dasar layar, tab chat kecil dengan nama dan titik hijau online; daftar chat di kanan memakai label Web atau Mobile di samping titik hijau                                                                                                                                            |
| Ikon               | Sprite atau SVG kecil bergaya flat 2015, bukan ikon bulat modern                                                                                                                                                                                                                                  |
| Motion             | Minimal; hanya fade pendek untuk dropdown dan pergantian status tombol                                                                                                                                                                                                                            |

Langkah praktis: buat `tokens.scss` (warna, jarak, font) lebih dulu, lalu semua komponen hanya membaca token itu. Dengan begitu fitur Time Travel (tema 2010, 2015, 2020) tinggal mengganti satu set token.

Responsif: target utama desktop. Tambahkan satu breakpoint sederhana yang menyembunyikan sidebar kiri dan kanan di bawah sekitar 900 px agar bisa dibuka di ponsel.

### Detail tambahan dari referensi

- Halaman login: header biru dengan kolom email dan password di kanan atas, tombol Log In, tagline di kiri dengan tiga poin berikon (feed, timeline, pencarian), dan formulir Sign Up di kanan dengan tombol hijau. Pakai susunannya, tetapi dengan nama, logo, dan ikon buatan sendiri.

- Composer: tiga tab (Status, Photo / Video, Life Event) di atas kolom tulis dengan teks abu-abu "What's on your mind?".

- Post: foto kecil persegi di kiri, nama berwarna biru, waktu dan ikon privasi di bawah nama, panah kecil di pojok kanan atas untuk menu.

- Komentar: kolom "Write a comment..." dengan foto kecil pengguna di kiri serta ikon kamera dan emoji di kanan.

- Kolom kanan: kartu rekomendasi dengan tombol Like atau Join, label Sponsored untuk promosi, lalu daftar chat penuh tinggi dengan kolom Search di dasar.

- Footer kecil: bahasa, Privacy, Terms, Cookies, More, dan hak cipta; pakai nama sendiri.

- Pegangan era: pakai gaya 2014 sampai Maret 2015; referensi bergaya 2019 (navbar lebih terang, ikon Messenger, tombol Use App) hanya sebagai pembanding.

## Endpoint API

API memakai REST di bawah prefix `/api`, semua kecuali register dan login butuh JWT, dan route `/admin/*` butuh role ADMIN.

| Modul            | Endpoint                                                                                                                                                                                | Fungsi                                     |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------|
| auth             | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`                                                                                                    | Daftar, masuk, perbarui token, keluar      |
| users            | `GET /users/me`, `PATCH /users/me`, `GET /users/:username`, `POST /users/me/avatar`, `POST /users/me/cover`                                                                             | Profil sendiri dan orang lain, unggah foto |
| posts            | `GET /feed`, `POST /posts`, `GET /posts/:id`, `PATCH /posts/:id`, `DELETE /posts/:id`, `GET /users/:username/posts`                                                                     | Feed, buat, baca, ubah, hapus, timeline    |
| share            | `POST /posts/:id/share`                                                                                                                                                                 | Bagikan post                               |
| likes            | `POST /posts/:id/like`, `DELETE /posts/:id/like`, `POST /comments/:id/like`                                                                                                             | Like dan batalkan                          |
| comments         | `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id`                                                                                                           | Komentar                                   |
| friends          | `GET /friends`, `GET /friends/requests`, `POST /friends/request/:userId`, `POST /friends/accept/:id`, `POST /friends/reject/:id`, `DELETE /friends/:userId`, `GET /friends/suggestions` | Pertemanan dan saran                       |
| pokes            | `POST /pokes/:userId`, `GET /pokes`                                                                                                                                                     | Poke dan daftar poke                       |
| messages         | `GET /messages/conversations`, `GET /messages/:userId`, `POST /messages/:userId`, `POST /messages/:userId/read`                                                                         | Chat                                       |
| notifications    | `GET /notifications`, `POST /notifications/read`, `GET /notifications/unread-count`                                                                                                     | Notifikasi                                 |
| search           | `GET /search?q=`                                                                                                                                                                        | Cari orang                                 |
| trending         | `GET /trending`                                                                                                                                                                         | Hashtag populer                            |
| reports          | `POST /reports`                                                                                                                                                                         | User melaporkan post, komentar, atau user  |
| uploads          | `POST /uploads/image`                                                                                                                                                                   | Unggah gambar, kembalikan URL              |
| admin: statistik | `GET /admin/stats`, `GET /admin/stats/timeseries`                                                                                                                                       | Dashboard                                  |
| admin: user      | `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/role`, `POST /admin/users/:id/reset-password`, `DELETE /admin/users/:id`           | Manajemen user                             |
| admin: konten    | `GET /admin/posts`, `PATCH /admin/posts/:id/hide`, `DELETE /admin/posts/:id`, `GET /admin/comments`, `PATCH /admin/comments/:id/hide`                                                   | Moderasi                                   |
| admin: laporan   | `GET /admin/reports`, `PATCH /admin/reports/:id`                                                                                                                                        | Tangani laporan                            |
| admin: sistem    | `GET /admin/settings`, `PUT /admin/settings/:key`, `GET /admin/blocked-words`, `POST /admin/blocked-words`, `DELETE /admin/blocked-words/:id`                                           | Pengaturan dan kata terlarang              |
| admin: lain      | `GET /admin/audit-logs`, `POST /admin/announcements`, `GET /admin/bots`, `PATCH /admin/bots/:id`                                                                                        | Audit, pengumuman, bot                     |

Konvensi: respons daftar memakai paginasi berbasis cursor (`?cursor=&limit=`), error memakai format seragam `{ statusCode, message, code }`, dan validasi input lewat DTO dengan class-validator.

## Realtime

Realtime cukup dibangun dengan satu Socket.IO gateway di NestJS tanpa Redis, selama aplikasi berjalan di satu instance.

| Event                                  | Arah             | Fungsi                                                               |
|----------------------------------------|------------------|----------------------------------------------------------------------|
| `auth` (handshake)                     | client ke server | Kirim JWT saat connect; server memasukkan socket ke room `user:<id>` |
| `presence:online` / `presence:offline` | server ke teman  | Titik hijau di chat sidebar; `lastSeenAt` diperbarui saat disconnect |
| `chat:send`                            | client ke server | Simpan pesan, lalu teruskan ke room penerima                         |
| `chat:message`                         | server ke client | Pesan baru muncul di jendela chat                                    |
| `chat:typing`                          | dua arah         | Indikator mengetik                                                   |
| `chat:read`                            | client ke server | Tandai pesan terbaca                                                 |
| `notification:new`                     | server ke client | Menambah badge jewel dan isi dropdown                                |
| `friend:request`                       | server ke client | Badge teman bertambah                                                |

Saat dikembangkan ke banyak instance, tambahkan Redis adapter untuk Socket.IO; sampai saat itu tidak diperlukan.

## Keamanan, privasi & moderasi

Karena ini aplikasi yang menyimpan akun dan konten orang lain, bagian ini wajib selesai sebelum aplikasi dibuka ke publik.

- Password: hash dengan argon2 atau bcrypt, jangan pernah dikembalikan di respons API.

- Token: access token pendek, refresh token disimpan sebagai hash di tabel `RefreshToken` dan dicabut saat logout atau saat user di-ban.

- Otorisasi: setiap query post dan profil memeriksa privasi (Public, Friends, Only me) dan status blokir di sisi server, bukan di frontend.

- Rate limiting: batasi login, register, kirim pesan, dan poke dengan `@nestjs/throttler`.

- Validasi: DTO dengan class-validator; bersihkan input teks agar aman dari XSS; frontend tidak memakai `v-html` untuk konten user.

- Upload: batasi tipe (jpg, png, webp) dan ukuran (misalnya 5 MB), ganti nama file, dan periksa isi file, bukan hanya ekstensi.

- CORS dan header: izinkan hanya origin web dan admin; aktifkan `helmet`.

- Admin: akses admin hanya untuk role ADMIN, semua aksi masuk audit log, dan sesi admin sebaiknya lebih pendek.

- Moderasi: tombol Report di setiap post dan komentar, daftar kata terlarang, dan opsi sembunyikan sebelum hapus.

- Privasi data: sediakan halaman kebijakan privasi singkat dan cara menghapus akun; hapus atau anonimkan data saat akun dihapus.

- Bot AI: tandai jelas sebagai bot di data (`isBot`) dan di UI admin; konten yang dihasilkan tetap melewati filter kata terlarang.

## Testing, seeding & deployment

Tes difokuskan pada logika yang mudah rusak (privasi, pertemanan, otorisasi), bukan pada setiap komponen visual.

### Testing

- Unit API (Jest): aturan privasi feed, alur friend request, guard role, dan filter kata terlarang.

- Unit web (Vitest): store Pinia (auth, feed, chat) dan komponen PostCard serta StatusBox.

- E2E (Playwright): register, login, buat post, like, tambah teman, kirim chat; plus satu alur admin (suspend user, sembunyikan post).

### Seeding data dummy

- Satu perintah `pnpm db:seed` membuat 1 admin, sekitar 30 user dummy, jaringan pertemanan acak, 200 post, dan komentar serta like acak.

- Foto profil dummy memakai gambar placeholder lokal agar tidak bergantung layanan luar.

- Seeder bisa dijalankan ulang dengan mode reset untuk demo.

### Deployment

- Docker Compose dengan layanan `mysql`, `api`, `web`, dan `admin`; web dan admin disajikan sebagai file statis lewat Nginx.

- File `.env` per aplikasi (DATABASE_URL, JWT_SECRET, CORS_ORIGINS); jangan masuk ke git.

- CI sederhana: install, lint, test, build pada setiap push.

- Domain terpisah untuk web dan admin, atau admin di subpath yang dibatasi IP jika dibuka publik.

- Backup MySQL berkala jika data user asli sudah ada.

## Roadmap mingguan

Rencana 10 minggu paruh waktu dengan dua gerbang: akhir minggu 4 (Fase 1 layak dipamerkan) dan akhir minggu 7 (Fase 2 selesai); admin panel dikerjakan setelahnya karena butuh data user dan post.

### Minggu 1: Fondasi

- Buat monorepo PNPM (apps/web, apps/admin, apps/api, packages/db, packages/shared)

- Docker Compose untuk MySQL, schema Prisma awal (User, RefreshToken), migrasi pertama

- Modul auth NestJS: register, login, refresh, logout

- `tokens.scss` dan base style 2015; halaman login dan register bergaya parodi

### Minggu 2: Feed dan post

- Model Post, endpoint buat dan baca feed dengan cursor pagination

- Navbar biru, layout tiga kolom, StatusBox

- Upload gambar (Multer) dan tampil di post

- Privasi post (Public, Friends, Only me) diperiksa di server

### Minggu 3: Interaksi

- Like dan unlike pada post dan komentar

- Komentar dengan daftar berurutan

- Share post; edit dan hapus (soft delete)

### Minggu 4: Profil dan teman (gerbang Fase 1)

- Halaman profil: cover, foto profil, bio, kartu info, grid teman, timeline

- Sistem pertemanan: kirim, terima, tolak, unfriend

- Feed hanya menampilkan post teman dan diri sendiri

- Tes e2e alur utama; rekam demo singkat untuk konten

### Minggu 5: Notifikasi

- Model Notification dan endpoint

- Socket.IO gateway dengan auth JWT

- Jewel notifikasi dan friend request dengan badge realtime

### Minggu 6: Chat dan poke

- Model Message, endpoint riwayat

- Chat sidebar dengan presence online

- Chat dock di dasar layar (maksimal 3 jendela), indikator mengetik, tanda terbaca

- Poke dan notifikasinya

### Minggu 7: Pelengkap Fase 2 (gerbang Fase 2)

- Wall post dan tag teman

- Pencarian orang, Sort feed, dan scroller tahun di timeline

- People You May Know, trending topics, birthday reminder

- Tombol Report di post dan komentar (disiapkan untuk admin)

### Minggu 8: Admin panel dasar

- Aplikasi apps/admin, login admin, RolesGuard dan seed admin pertama

- Dashboard: kartu statistik dan grafik

- Manajemen user: daftar, filter, suspend, ban, reset password, ubah role

- Audit log untuk semua aksi di atas

### Minggu 9: Admin moderasi

- Moderasi post dan komentar (sembunyikan, hapus, aksi massal)

- Antrean laporan dan penanganannya

- Kata terlarang, pengaturan sistem (maintenance, buka tutup pendaftaran)

- Pengumuman ke semua user

### Minggu 10: Bonus, hardening, dan rilis

- Seeder data dummy dan bot AI sebagai teman

- Pilih satu atau dua fitur Fase 3 (misalnya album foto atau privacy setting)

- Rate limiting, helmet, audit upload, tinjau semua aturan privasi

- Docker Compose produksi, CI, README, dan video demo

Jika waktu mepet, korbankan Fase 3 dan bonus dulu; jangan korbankan keamanan dan moderasi.

## Risiko & keputusan terbuka

Risiko terbesar adalah scope yang melebar dan mengambil waktu dari Insell, bukan kesulitan teknisnya.

| Risiko                             | Dampak                                  | Penanganan                                                                         |
|------------------------------------|-----------------------------------------|------------------------------------------------------------------------------------|
| Scope creep (terlalu banyak fitur) | Proyek tidak selesai                    | Kunci Fase 1 sebagai target; Fase 3 dan bonus hanya jika waktu sisa                |
| Bersaing waktu dengan Insell       | Fokus terpecah                          | Jadwalkan blok waktu tetap per minggu; pakai pola yang sama agar ada transfer ilmu |
| Privasi feed salah                 | Konten bocor ke orang yang tidak berhak | Tes otomatis untuk setiap aturan privasi; pemeriksaan di server                    |
| Konten buruk dari user             | Masalah moderasi                        | Report, kata terlarang, dan alat admin dikerjakan sebelum dibuka ke publik         |
| Dikira situs asli                  | Masalah merek dan kepercayaan           | Nama dan logo sendiri, label parodi, tanpa login tiruan                            |
| Biaya dan beban realtime           | Server berat                            | Satu instance dulu; Redis adapter hanya jika perlu                                 |

### Keputusan yang masih terbuka

- Nama final dan logo aplikasi

- Hanya demo lokal dan konten, atau dibuka untuk publik

- Pakai bot AI sejak awal atau hanya sebagai bonus

- Penyimpanan file: disk lokal atau layanan S3-compatible

- Admin di domain terpisah atau subpath

### Ide lanjutan

- Mode Time Travel yang mengganti seluruh tema ke 2010 atau 2020

- Konten Coderium: seri "membangun jejaring sosial 2015 dari nol" per fase

- Mengambil pola auth, role, dan struktur modul NestJS dari proyek ini untuk Insell
