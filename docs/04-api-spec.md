# API Specification: Retro Social Network 2015 + Admin Panel

Dibuat 2026-11-24 · Ganjar Hadiatna · Status: draf 1

Dokumen ini adalah kontrak antara `apps/api` (NestJS) dan dua frontend (`apps/web`, `apps/admin`). ID kebutuhan merujuk ke [PRD](02-prd.md); nama tabel dan kolom merujuk ke [ERD](03-erd.md). Bila ada selisih, PRD menang untuk perilaku dan ERD menang untuk data.

## 1. Konvensi

| Topik | Aturan |
|---|---|
| Base URL | `/api` (user) dan `/api/admin` (admin, dibatasi RolesGuard role ADMIN) |
| Format | JSON, UTF-8; upload memakai `multipart/form-data` |
| Auth | Header `Authorization: Bearer <accessToken>`; access token umur pendek (usulan 15 menit), refresh token usulan 30 hari |
| Waktu | ISO 8601 UTC, contoh `2026-11-24T08:30:00.000Z`; konversi zona waktu di frontend |
| ID | Integer (sesuai ERD); dikirim sebagai number |
| Penamaan field | `camelCase` di API, `snake_case` di database (Prisma memetakan) |
| Pagination | Cursor: `?limit=10&cursor=<id>`; respons `{ items, nextCursor }`, `nextCursor` null bila habis. Default limit 10, maksimum 50 |
| Sort | Terbaru di atas (`createdAt desc, id desc`) kecuali disebut lain |
| Soft delete | Data dengan `deleted_at` atau `hidden` tidak pernah muncul di respons user (BR-06, BR-07) |
| Privasi | Diperiksa di server pada setiap query (BR-02 sampai BR-04, BR-11) |
| Idempotensi | Like, poke, dan permintaan teman aman diulang; hasil akhir sama |

### 1.1 Format error

Semua error memakai bentuk yang sama:

```json
{ "statusCode": 400, "message": "Password minimal 8 karakter", "code": "VALIDATION_FAILED" }
```

`message` aman ditampilkan ke pengguna. Untuk validasi banyak field, `message` boleh berupa array string.

| Status | Kapan | Kode contoh |
|---|---|---|
| 400 | Validasi DTO gagal | `VALIDATION_FAILED`, `CONTENT_BLOCKED_WORD` |
| 401 | Token hilang, salah, atau kedaluwarsa | `UNAUTHORIZED`, `TOKEN_EXPIRED` |
| 403 | Login tapi tidak berhak | `FORBIDDEN`, `ACCOUNT_SUSPENDED`, `ACCOUNT_BANNED`, `MAINTENANCE_MODE` |
| 404 | Tidak ada, atau disembunyikan karena privasi atau blokir (sengaja sama agar tidak bocor) | `NOT_FOUND` |
| 409 | Konflik state | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `ALREADY_FRIENDS`, `REQUEST_PENDING` |
| 413 | File terlalu besar | `FILE_TOO_LARGE` |
| 415 | Tipe file tidak didukung | `UNSUPPORTED_MEDIA_TYPE` |
| 422 | Aturan bisnis dilanggar | `SELF_ACTION_NOT_ALLOWED`, `LAST_ADMIN` |
| 429 | Kena rate limit (BR-10) | `RATE_LIMITED` |

### 1.2 Rate limit (BR-10)

| Endpoint | Batas usulan |
|---|---|
| `POST /auth/login` | 10 per menit per IP, 5 gagal beruntun per akun memicu jeda 5 menit |
| `POST /auth/register` | 5 per jam per IP |
| `POST /messages` | 60 per menit per user |
| `POST /pokes` | 20 per jam per user |

Respons 429 menyertakan header `Retry-After` (detik).

Status implementasi (T-40): semua batas di atas aktif, dihitung dengan jendela tetap di memori (satu instance; naik ke Redis bersama adapter Socket.IO bila ada banyak instance, R-06). `POST /messages/:userId` dan event socket `message:send` memakai satu bucket per user, jadi socket bukan jalan pintas; ack yang ditolak berbentuk `{ ok: false, code: 'RATE_LIMITED', retryAfter }`. `POST /pokes` menghitung juga poke ulang. Lockout akun: lima `INVALID_CREDENTIALS` beruntun untuk satu identifier (tanpa membedakan huruf besar kecil, juga untuk identifier yang tidak ada) memicu 429 selama 5 menit walau password berikutnya benar; login berhasil menghapus hitungan, kegagalan lebih tua dari 15 menit dilupakan, dan akun ditangguhkan atau diblokir (403) tidak dihitung. Konsekuensi yang diterima: pihak lain bisa mengunci akun dengan sengaja gagal login. IP dibaca dari `req.ip`; di belakang reverse proxy `trust proxy` harus diaktifkan, kalau tidak semua pengguna berbagi satu bucket. Limiter mati di bawah Jest (`NODE_ENV=test`); tes rate limit menyalakannya dengan jam buatan. Endpoint login admin (`/admin/auth/login`) belum memakai batas ini.

### 1.3 Objek bersama

```ts
type UserSummary = {
  id: number; username: string; displayName: string;
  avatarUrl: string | null; isBot: boolean;
};

type Post = {
  id: number;
  author: UserSummary;
  wallOwner: UserSummary | null;      // terisi bila ditulis di dinding teman (WAL-01)
  sharedFrom: Post | null;            // null bila bukan share; { unavailable: true } bila asal dihapus
  content: string;
  imageUrl: string | null;
  feeling: string | null;
  privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME';
  tags: UserSummary[];                // teman yang di-tag (WAL-02)
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  likedPreview: UserSummary[];        // sampai 2 nama untuk "A, B, and 3 others like this"
  editedAt: string | null;
  createdAt: string;
};

type Comment = {
  id: number; postId: number; author: UserSummary;
  content: string; imageUrl: string | null;
  likeCount: number; likedByMe: boolean; createdAt: string;
};

type Paged<T> = { items: T[]; nextCursor: number | null };
```

## 2. Autentikasi dan akun (AUTH-01 sampai AUTH-06)

| Method | Path | Auth | Fungsi | Sukses |
|---|---|---|---|---|
| POST | `/auth/register` | tidak | Daftar akun baru | 201 |
| POST | `/auth/login` | tidak | Login dengan email atau username | 200 |
| POST | `/auth/refresh` | refresh token | Tukar refresh token dengan pasangan baru (rotasi) | 200 |
| POST | `/auth/logout` | ya | Cabut refresh token saat ini | 204 |
| POST | `/auth/forgot-password` | tidak | Kirim tautan reset (Fase 3, AUTH-05) | 202 |
| POST | `/auth/reset-password` | tidak | Setel password dengan token sekali pakai | 204 |
| GET | `/me` | ya | Profil diri sendiri beserta jumlah notifikasi dan pesan belum dibaca | 200 |
| PATCH | `/me` | ya | Ubah profil (PRF-02) | 200 |
| PATCH | `/me/password` | ya | Ganti password (butuh password lama) | 204 |
| DELETE | `/me` | ya | Hapus akun, soft delete dan anonimisasi sesuai BR-06 (AUTH-06) | 204 |

**POST /auth/register**

```json
// request
{ "email": "a@b.com", "username": "budi_01", "displayName": "Budi", "password": "minimal8kar" }
// 201
{ "user": { "id": 31, "username": "budi_01", "displayName": "Budi" }, "accessToken": "…", "refreshToken": "…" }
```

Aturan: email unik, username 3 sampai 30 karakter (huruf, angka, titik, garis bawah) dan unik, password minimal 8 karakter. Ditolak 403 `REGISTRATION_CLOSED` bila setting `registration_open` false (ADM-12). Password disimpan sebagai hash argon2 atau bcrypt, tidak pernah dikembalikan.

**POST /auth/login**

```json
{ "identifier": "budi_01", "password": "…" }
// 200 sama bentuk dengan register
```

Akun SUSPENDED atau BANNED mendapat 403 (`ACCOUNT_SUSPENDED` atau `ACCOUNT_BANNED`) dan tidak menerima token (AUTH-04, BR-05). Saat maintenance mode aktif, non-admin mendapat 403 `MAINTENANCE_MODE` (BR-12). Pesan salah password sengaja sama untuk email atau username yang tidak ada.

**POST /auth/refresh**: rotasi; token lama dicabut (`revoked_at`) dan yang baru dikembalikan. Memakai refresh token yang sudah dicabut berarti kemungkinan pencurian: semua refresh token user tersebut dicabut dan 401 dikembalikan.

Status implementasi (T-22): `PATCH /me`, `POST /me/avatar`, dan `POST /me/cover` sudah ada dan mengembalikan objek Profile milik sendiri (`relationship: "SELF"`); `GET /me`, ganti password, dan hapus akun menyusul. Field yang tidak dikirim tidak berubah; `null` atau teks kosong mengosongkan kolom opsional (bio, kota, tempat kerja, sekolah, tanggal lahir); `displayName` tidak boleh kosong. Batas: nama 80, kota 80, tempat kerja dan sekolah 120, bio 2.000 karakter; tanggal lahir `YYYY-MM-DD` yang ada di kalender, antara 1900-01-01 dan hari ini. Field lain (role, status, email, username, avatarUrl, coverUrl, isBot) ditolak 400. Ganti foto hanya mengganti URL; berkas lama tetap di disk. Respons login, register, dan refresh kini juga menyertakan `avatarUrl` pada `user` (untuk navbar).

**PATCH /me** menerima: `displayName`, `bio`, `birthday` (YYYY-MM-DD), `hometown`, `currentCity`, `workplace`, `school`. Semua opsional.

## 3. Pengguna, profil, dan foto (PRF-01 sampai PRF-06)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/users/:username` | Profil publik sesuai privasi: info, jumlah teman, status hubungan dengan pemanggil |
| GET | `/users/:username/posts` | Timeline profil (cursor); filter `?year=2014` untuk scroller tahun (PRF-05) |
| GET | `/users/:username/friends` | Daftar teman (cursor), menyertakan `total` |
| GET | `/users/:username/photos` | Foto dari post dan album (Fase 3) |
| POST | `/me/avatar` | Unggah foto profil, field `file` (PRF-03) |
| POST | `/me/cover` | Unggah cover (PRF-03) |
| GET | `/users/:username/years` | Daftar tahun yang punya post, untuk scroller tahun |

Status implementasi (T-20): `GET /users/:username` dan `GET /users/:username/posts` (tanpa `?year`, T-44) sudah ada; `/users/:username/friends` dan `/photos` menyusul di T-24, serta `/me`, `PATCH /me`, dan unggah avatar atau cover di T-22. Profil mengembalikan `id, username, displayName, avatarUrl, coverUrl, isBot, bio, birthday (YYYY-MM-DD), hometown, currentCity, workplace, school, friendCount, relationship, createdAt` dan tidak pernah memuat email, role, atau status akun. Username dicocokkan tanpa memperhatikan huruf besar. Akun tidak ada, BANNED, atau terhapus: 404 yang sama (BR-05); akun SUSPENDED tetap terlihat. Timeline memakai aturan visibilitas yang sama dengan feed (hanya post milik pemilik profil yang boleh dibaca pemanggil), terbaru dulu, kursor, 10 per halaman. Pemblokiran (BR-11) belum diterapkan.

Status implementasi (T-24): `GET /users/:username/friends` (daftar teman pemilik profil, `{ items, nextCursor, total }`, `?q=`; terlihat oleh semua member sampai PRF-06) dan `GET /users/:username/photos` (`{ items: [{ postId, url, createdAt }], nextCursor }`) sudah ada. Photos berisi gambar dari post pemilik profil yang boleh dilihat pembaca (aturan yang sama dengan timeline); foto dari album dan foto profil menyusul di Fase 3. Keduanya 404 untuk profil yang tidak ada, BANNED, atau terhapus.

`relationship` pada profil bernilai salah satu: `SELF`, `FRIENDS`, `REQUEST_SENT`, `REQUEST_RECEIVED`, `NONE`. Bila pemanggil diblokir atau memblokir pemilik profil, respons 404 (BR-11).

**Upload gambar**: JPG, PNG, atau WebP, maksimum 5 MB, isi file diperiksa (bukan hanya ekstensi). Server menyimpan di disk lokal (`UPLOAD_DIR`) dan mengembalikan `{ "url": "/uploads/…" }`. Foto lama tetap tersimpan. Tipe dikenali dari byte awal berkas (JPG, PNG, WebP) dan ekstensi mengikuti isi; nama berkas diacak (32 hex). Kode: 413 `FILE_TOO_LARGE` bila lebih dari 5 MB, 415 `UNSUPPORTED_MEDIA_TYPE` bila bukan gambar yang diizinkan, 400 bila field `file` kosong. Catatan: `/uploads/*` disajikan tanpa login (URL acak tidak bisa ditebak, tetapi siapa pun yang punya URL bisa membukanya); ini batasan yang diterima sampai penyimpanan S3-compatible dengan URL bertanda tangan.

## 4. Post, feed, like, komentar (POST-01 sampai POST-10, INT-01 sampai INT-05)

### 4.1 Feed dan post

| Method | Path | Fungsi |
|---|---|---|
| GET | `/feed` | News feed: post teman dan diri sendiri (cursor). `?sort=recent` (default) atau `?sort=top` (POST-09) |
| POST | `/posts` | Buat post |
| GET | `/posts/:id` | Satu post (untuk tautan notifikasi) |
| PATCH | `/posts/:id` | Edit; hanya pemilik; mengisi `editedAt` |
| DELETE | `/posts/:id` | Soft delete; pemilik, atau pemilik dinding pada wall post (BR-04) |
| POST | `/posts/:id/share` | Buat post baru yang merujuk post asal (POST-07) |
| POST | `/uploads/post-image` | Unggah gambar lebih dulu, hasilnya `imageUrl` untuk dipakai di POST /posts |

Status implementasi (T-23): `POST /posts/:id/share` menerima `{ content?, privacy? }` (teks opsional sampai 5.000 karakter, privasi default FRIENDS, tanpa foto) dan mengembalikan 201 dengan Post baru. Post asal harus terlihat oleh pembagi (404 yang sama bila tidak). Share dari share merujuk post asal pertamanya (tanpa rantai); bila post asal itu tidak lagi terlihat oleh pembagi: 422. Pada Post, `sharedFrom` bernilai `null` untuk post biasa, objek ringkas `{ id, author, content, imageUrl, createdAt }` bila asal terlihat oleh PEMBACA, dan `{ unavailable: true }` bila asal dihapus, disembunyikan, penulisnya BANNED, atau tidak boleh dilihat pembaca itu. Visibilitas asal dicek saat dibaca, bukan saat dibagikan, sehingga membagikan post FRIENDS ke publik tidak membocorkan isinya (itu menyimpang dari tipe 1.3 yang menyebut `sharedFrom: Post`; jumlah like dan komentar milik share itu sendiri). Isi share boleh dikosongkan lewat PATCH, tetapi foto tidak bisa ditambahkan.

**POST /posts**

```json
{
  "content": "Lagi nostalgia 2015",
  "imageUrl": "/uploads/abc.jpg",
  "privacy": "FRIENDS",
  "feeling": "feeling nostalgic",
  "wallOwnerUsername": null,
  "taggedUserIds": [4, 9]
}
```

Status implementasi (T-12): hanya `content`, `imageUrl`, dan `privacy` yang diterima; `feeling`, `wallOwnerUsername`, `taggedUserIds`, hashtag, dan kata terlarang menyusul (T-35, T-42, T-56) dan field asing ditolak 400. `imageUrl` hanya menerima URL hasil `POST /uploads/post-image` yang berkasnya ada. `GET /feed` baru mendukung urutan terbaru (`sort=top`: T-43). Bukan pemilik: 403 bila post terlihat, 404 bila tidak.

Aturan: `content` maksimal 5.000 karakter; boleh kosong hanya bila `imageUrl` ada; mengandung kata terlarang menghasilkan 400 `CONTENT_BLOCKED_WORD` (BR-08, konten tidak disimpan, kejadian dicatat untuk antrean moderasi); hashtag (`#kata`) diekstrak ke `hashtags` dan `post_hashtags`. `wallOwnerUsername` hanya sah untuk teman; wall post mengikuti BR-04. Tag hanya untuk teman dan memicu notifikasi `TAG`.

Status implementasi (T-35): `wallOwnerUsername` dan `taggedUserIds` diterima saat membuat post (bukan saat mengedit: 400). Wall post: pemilik dinding harus teman penulis; bukan teman, PENDING, diblokir, BANNED, terhapus, atau tidak ada memberi 404 yang sama, dinding sendiri 422 `SELF_ACTION_NOT_ALLOWED`, `privacy: ONLY_ME` 400; privasi tersimpan selalu FRIENDS karena keterlihatan wall post ditentukan BR-04 (teman penulis dan pemilik dinding, ditambah keduanya sendiri). Pemilik dinding boleh menghapus tetapi tidak mengedit. Tag: maksimal 10, unik, semuanya teman penulis (selain itu 422 `UNPROCESSABLE`, tidak ada yang tersimpan); `tags` pada Post berisi yang masih terlihat bagi pembaca (BANNED, terhapus, atau terblokir disembunyikan). Notifikasi: `WALL_POST` ke pemilik dinding; `TAG` ke yang di-tag hanya bila ia boleh melihat post itu (ONLY_ME, atau teman penulis yang bukan teman pemilik dinding, tidak dikabari); pemilik dinding yang juga di-tag hanya mendapat `WALL_POST`.

**Visibilitas di feed** (BR-02, BR-03, BR-05, BR-11): post terlihat bila pemanggil adalah penulis, atau privasi PUBLIC, atau privasi FRIENDS dan penulis adalah teman, dan penulis tidak BANNED, dan tidak ada blokir dua arah, dan `hidden` false dan `deleted_at` null.

### 4.2 Like (INT-01, INT-03)

| Method | Path | Fungsi |
|---|---|---|
| PUT | `/posts/:id/like` | Like (idempoten) |
| DELETE | `/posts/:id/like` | Unlike |
| PUT | `/comments/:id/like` | Like komentar |
| DELETE | `/comments/:id/like` | Unlike komentar |
| GET | `/posts/:id/likes` | Daftar penyuka (cursor) |

Hanya satu jenis reaksi, yaitu Like (BR-13). Status implementasi (T-15): endpoint post (PUT/DELETE `/posts/:id/like` dan GET `/posts/:id/likes`) sudah ada; endpoint komentar menunggu T-16 dan INT-03. Hanya pada post yang terlihat (404 yang sama bila tidak); penyuka BANNED atau terhapus tidak dihitung dan tidak ditampilkan (BR-05). Respons semua endpoint like: `{ "likeCount": 12, "likedByMe": true }`.

### 4.3 Komentar (INT-02, INT-05)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/posts/:id/comments` | Urut lama ke baru (cursor) |
| POST | `/posts/:id/comments` | Tambah komentar `{ content, imageUrl? }`, maksimal 2.000 karakter |
| DELETE | `/comments/:id` | Pemilik komentar atau pemilik post |

Kata terlarang berlaku sama seperti post.

Status implementasi (T-16): `imageUrl` pada komentar (INT-05) dan kata terlarang belum ada; `likeCount` dan `likedByMe` komentar selalu 0 dan false sampai INT-03. Komentar terlihat bila post induknya terlihat, belum dihapus, penulisnya tidak BANNED atau terhapus, dan tidak hidden kecuali milik pembaca (BR-07); `commentCount` di post memakai aturan yang sama. Daftar berurut lama ke baru dengan kursor maju; UI memuat halaman pertama saat "View N comments" diklik dan "View more comments" muncul di bawah daftar (bukan di atas) karena urutan maju.

### 4.4 Laporan (INT-04)

| Method | Path | Fungsi |
|---|---|---|
| POST | `/reports` | `{ targetType: 'POST'|'COMMENT'|'USER', targetId, reason: 'SPAM'|'HARASSMENT'|'INAPPROPRIATE'|'OTHER', note? }` |

Satu laporan per pelapor per target; mengulang mengembalikan 409 `ALREADY_REPORTED`. `targetId` divalidasi di service karena tidak ada FK (ERD).

## 5. Pertemanan, poke, blokir (FRD-01 sampai FRD-07, POK-01)

| Method | Path | Fungsi |
|---|---|---|
| POST | `/friends/requests` | `{ userId }` kirim permintaan (FRD-01) |
| GET | `/friends/requests` | Permintaan masuk yang PENDING |
| POST | `/friends/requests/:userId/accept` | Terima (FRD-02) |
| DELETE | `/friends/requests/:userId` | Tolak, atau batalkan bila pemanggil pengirim |
| DELETE | `/friends/:userId` | Unfriend, hapus baris (FRD-03) |
| GET | `/friends` | Daftar teman sendiri; `?q=` untuk filter nama |
| GET | `/friends/suggestions` | People You May Know (FRD-05), berdasarkan teman bersama, tanpa yang sudah teman atau diblokir |
| GET | `/friends/birthdays` | Teman yang berulang tahun hari ini (FRD-07) |
| POST | `/pokes` | `{ userId }` poke atau poke balik (POK-01) |
| GET | `/pokes` | Poke aktif yang diterima dan belum dibalas (cursor) |
| DELETE | `/pokes/:userId` | "Remove": tandai poke dari user itu sudah dilihat |
| POST | `/blocks` | `{ userId }` blokir; menghapus pertemanan/permintaan yang ada dalam transaksi |
| DELETE | `/blocks/:userId` | Buka blokir |
| GET | `/blocks` | Daftar yang diblokir (cursor `limit`/`cursor`) |

Status implementasi (T-18): permintaan, terima, tolak/batalkan, unfriend, daftar permintaan masuk, dan daftar teman sudah ada; saran teman, birthday, dan poke menyusul. Kode respons:

- `POST /friends/requests` 201 `{ userId, status }` dengan status `PENDING`, atau `ACCEPTED` bila lawan sudah mengirim lebih dulu (permintaan silang). Mengirim ulang permintaan sendiri yang masih PENDING: 409 `REQUEST_PENDING`; sudah berteman: 409 `ALREADY_FRIENDS`; user tidak ada, BANNED, atau terhapus: 404; diri sendiri: 422 `SELF_ACTION_NOT_ALLOWED`.
- `POST /friends/requests/:userId/accept` 200 (hanya penerima; selain itu 404; diulang aman). `DELETE /friends/requests/:userId` dan `DELETE /friends/:userId` 204, 404 bila tidak ada baris yang cocok.
- `GET /friends/requests` mengembalikan `{ items: [{ user, createdAt }], nextCursor }`, terbaru dulu. `GET /friends` mengembalikan `{ items: UserSummary[], nextCursor, total }`, terbaru dulu, `?q=` mencocokkan nama atau username apa adanya (karakter `%` dan `_` bukan wildcard). Teman yang BANNED atau terhapus tidak ditampilkan dan tidak dihitung.
- Blokir tersedia melalui `/blocks`; permintaan antar pasangan yang saling memblokir ditolak 404 dan saat memblokir relasi pertemanan/permintaan dihapus dalam transaksi.

Status implementasi (T-41): `GET /friends/suggestions?limit=` (bawaan 5, 1 sampai 20) mengembalikan `{ items: [{ user, mutualFriends }] }`: teman dari teman, urut jumlah teman bersama lalu id. Tidak memuat diri sendiri, siapa pun yang sudah punya baris pertemanan dengan pemanggil (teman, permintaan terkirim, atau masuk), bot, akun terhapus atau BANNED, maupun blokir dua arah; teman bersama yang tidak boleh dilihat pemanggil tidak dihitung. Agregasi di memori atas teman pemanggil (shortcut; ganti SQL bila graf membesar), kandidat teratas yang diperiksa 100. `GET /friends/birthdays?date=YYYY-MM-DD` (bawaan hari ini UTC; klien mengirim tanggal lokalnya; bukan tanggal kalender valid: 400) mengembalikan `{ items: UserSummary[] }` teman yang berulang tahun pada tanggal itu, urut nama, tanpa tahun lahir; yang lahir 29 Februari dirayakan 1 Maret pada tahun bukan kabisat. Keduanya hanya memuat yang lolos `VisibilityService`.

Aturan (BR-01, BR-11):

- Tidak bisa berteman dengan diri sendiri (422 `SELF_ACTION_NOT_ALLOWED`) atau dengan user yang saling memblokir (404).
- Satu baris per pasangan; service mengisi `pair_low_id` dan `pair_high_id` dengan min dan max dari dua id. Permintaan silang (A kirim ke B saat B sudah kirim ke A) langsung menjadi ACCEPTED di satu transaksi.
- Memblokir menghapus pertemanan dan permintaan yang ada dalam satu transaksi.
- Poke ulang memperbarui `created_at` dan mengosongkan `seen_at`. Keputusan D-6 (usulan dipakai, belum dikonfirmasi Ganjar): poke hanya antar teman.

Status implementasi (T-34): `POST /pokes` 200 `{ userId, createdAt }`; diri sendiri 422 `SELF_ACTION_NOT_ALLOWED`; bukan teman, permintaan PENDING, diblokir (arah mana pun), BANNED, terhapus, atau tidak ada: 404 yang sama. Upsert baris (from, to), penutupan poke lawan, dan notifikasi `POKE` berjalan dalam satu transaksi; membalas poke menandai poke lawan sebagai dilihat ("sampai dilihat atau dibalas"). Penerima mendapat `notification:new` dan `poke:new`. `GET /pokes` mengembalikan `{ items: [{ user, createdAt }], nextCursor }`, terbaru dulu, hanya poke belum dilihat dari teman yang masih boleh terlihat (unfriend, blokir, BANNED, atau terhapus menyembunyikannya). `DELETE /pokes/:userId` 204, 404 bila tidak ada poke aktif dari user itu. Rate limit 20 per jam menyusul di T-40.

## 6. Pencarian dan trending (SRC-01, SRC-02)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/search?q=bud` | Maksimal 8 hasil user untuk dropdown; menghormati blokir dan akun BANNED. Minimal 2 karakter |
| GET | `/trending` | Hashtag terbanyak 24 jam terakhir, maksimal 10, tanpa yang `hidden` (ADM-17) |
| GET | `/hashtags/:tag/posts` | Post publik dengan hashtag tersebut (cursor) |

Status implementasi (T-39): `GET /search?q=&limit=&cursor=` mengembalikan `{ items: UserSummary[], nextCursor }`. `q` di-trim, 2 sampai 80 karakter (selain itu 400 `VALIDATION_FAILED`); `limit` bawaan 8 (dropdown), maksimal 50 (halaman hasil memakai 10). Mencocokkan nama atau username yang mengandung kata kunci, tanpa membedakan huruf besar kecil; `%` dan `_` dicocokkan apa adanya. Hasil disaring `VisibilityService.userWhere`: akun terhapus, BANNED, dan pasangan saling blokir tidak muncul (SUSPENDED tetap muncul seperti di profil). Urutan abjad nama lalu id, belum berdasarkan relevansi (awalan atau teman dulu); hanya field ringkasan yang dikembalikan. 
Status implementasi (T-42): hashtag diekstrak dari `content` saat membuat, mengedit, dan membagikan post: `#kata` (huruf, angka, garis bawah; 1 sampai 50 karakter, tanpa membedakan huruf besar kecil, disimpan huruf kecil) harus diawali batas kata, jadi `a#b`, `&#39;`, dan kata lebih dari 50 karakter tidak dihitung; maksimal 10 hashtag unik per post, sisanya teks biasa (tidak ditolak). Saat mengedit, tag yang tetap tidak dibuat ulang (waktunya tidak bergeser, trending tidak bisa dicurangi dengan edit) dan tag yang dihapus dari teks dicabut. `GET /trending` mengembalikan `{ items: [{ tag, count }] }` (maksimal 10, urut jumlah lalu id tag; tidak berhalaman): jumlah post publik biasa (bukan wall post) dengan tautan hashtag dibuat dalam 24 jam terakhir, tanpa hashtag `hidden`, dan hanya post yang terlihat bagi pemanggil menurut `VisibilityService` (terhapus, `hidden`, penulis BANNED, dan pasangan blokir tidak dihitung). `GET /hashtags/:tag/posts?limit&cursor` mengembalikan `Paged<Post>` terbaru dulu, hanya post PUBLIC biasa yang terlihat dan tidak `hidden` (post FRIENDS teman pun tidak muncul di sini); `:tag` tanpa `#` dan tanpa membedakan huruf besar kecil; tag tidak dikenal memberi `{ items: [], nextCursor: null }` (bukan 404, tidak ada yang bocor). Post `hidden` keluar dari daftar publik ini bahkan bagi penulisnya; ia tetap melihatnya lewat detail dan feed.

## 7. Notifikasi (NTF-01, NTF-02)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/notifications` | Daftar (cursor), terbaru di atas |
| GET | `/notifications/unread-count` | `{ count }` untuk badge jewel |
| POST | `/notifications/read` | `{ ids?: number[] }` tandai terbaca; tanpa `ids` berarti semua. Hanya milik sendiri (id lain diabaikan). Respons `{ count }`: sisa belum dibaca |

Tipe: `LIKE`, `COMMENT`, `FRIEND_REQUEST`, `FRIEND_ACCEPT`, `POKE`, `TAG`, `WALL_POST`, `ANNOUNCEMENT`. Aksi pada konten sendiri tidak membuat notifikasi, begitu pula antar pasangan yang saling blokir; LIKE yang sama pada post yang sama dicatat sekali (like, unlike, like lagi). Daftar dan `unread-count` disaring saat dibaca lewat `VisibilityService`: notifikasi hilang bila aktor diblokir atau BANNED, atau post atau komentarnya dihapus atau tidak lagi boleh dilihat. Setiap notifikasi baru juga dikirim ke room `user:<id>` sebagai event `notification:new`. `text` berbahasa Inggris dari server. Dibuat saat ini oleh: like (LIKE), komentar (COMMENT), permintaan teman (FRIEND_REQUEST), terima (FRIEND_ACCEPT, satu transaksi dengan penerimaan); POKE, TAG, WALL_POST, ANNOUNCEMENT menyusul bersama fiturnya. Bentuk item:

```json
{ "id": 5, "type": "COMMENT", "actor": { "id": 4, "displayName": "Sari" }, "postId": 12, "commentId": 40, "text": "Sari commented on your post", "readAt": null, "createdAt": "…" }
```

## 8. Chat (CHT-01 sampai CHT-04)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/messages/conversations` | Daftar percakapan dengan pesan terakhir dan jumlah belum dibaca |
| GET | `/messages/unread-count` | `{ count }` pesan belum dibaca dari teman (badge jewel pesan; T-36) |
| GET | `/messages/:userId` | Riwayat dengan satu user (cursor ke arah lebih lama) |
| POST | `/messages/:userId` | Kirim `{ content, clientId? }` (REST sebagai cadangan bila socket putus) |
| POST | `/messages/:userId/read` | Tandai semua pesan dari user itu sebagai terbaca |
| GET | `/chat/friends` | Daftar teman untuk sidebar chat beserta status online |

Chat hanya antar teman dan tidak antar user yang saling blokir (BR-11). Pesan maksimal 2.000 karakter; filter kata terlarang berlaku.

Status implementasi (T-36, T-37): semua endpoint di atas. `GET /chat/friends` mengembalikan `{ items: [{ user, online, client, unreadCount }] }`: teman ACCEPTED yang tidak diblokir (maksimal 200), online dulu lalu urut nama; `client` `WEB` atau `MOBILE` hanya bila online (`MOBILE` hanya bila semua koneksinya mobile), `unreadCount` pesan belum dibaca dari teman itu. Bentuk pesan `{ id, senderId, receiverId, content, readAt, createdAt }` (`ChatMessage` di `packages/shared`). `content` di-trim; kosong atau lebih dari 2.000 karakter: 400 `VALIDATION_FAILED`. Lawan yang bukan teman ACCEPTED, saling blokir, BANNED, terhapus, atau tidak ada: 404 yang sama pada setiap endpoint (REST dan socket, dicek per permintaan); diri sendiri 422. `POST /messages/:userId` 201 untuk pesan baru, 200 bila `clientId` sudah pernah dikirim (pesan yang sama dikembalikan, tidak ada baris baru). Idempotensi `clientId` disimpan di memori 10 menit, satu instance (belum kolom database; naik ke kolom `client_id` UNIQUE bila ada lebih dari satu instance). `GET /messages/:userId` terbaru dulu, `nextCursor` menuju pesan lebih lama. `GET /messages/conversations` hanya memuat teman saat ini (`{ user, lastMessage, unreadCount }`, terbaru dulu, cursor id pesan terakhir); unfriend, blokir, atau BANNED menyembunyikan percakapannya. `POST /messages/:userId/read` 200 `{ updated }` dan memberi tahu pengirim lewat `message:read`. Filter kata terlarang (BR-08) belum diterapkan; menyusul bersama moderasi. Rate limit 60 per menit menyusul di T-40.

## 9. Realtime (Socket.IO)

Namespace `/realtime`. Klien terhubung dengan `auth: { token: <accessToken> }`; token tidak valid memutus koneksi dengan error `UNAUTHORIZED`. Setiap user masuk room `user:<id>`. Satu instance saja pada awalnya, Redis adapter hanya bila nanti perlu (R-06).

**Server ke klien**

| Event | Payload | Untuk |
|---|---|---|
| `notification:new` | objek notifikasi | NTF-02 |
| `message:new` | objek pesan | CHT-01 |
| `message:read` | `{ byUserId, upToMessageId }` | CHT-04 |
| `typing` | `{ userId, isTyping }` | CHT-04 |
| `presence` | `{ userId, online, client? }` | CHT-02, dikirim ke teman; `client` (`WEB` atau `MOBILE`, koneksi yang baru tersambung) hanya pada `online: true` (T-37) |
| `friend:request` | `{ from: UserSummary }` | FRD-01 |
| `poke:new` | `{ from: UserSummary }` | POK-01 |

**Klien ke server**

| Event | Payload | Fungsi |
|---|---|---|
| `message:send` | `{ toUserId, content, clientId }` | Kirim; server membalas ack `{ ok, message }`; `clientId` mencegah dobel |
| `typing` | `{ toUserId, isTyping }` | Indikator mengetik, dibatasi satu per detik |
| `message:read` | `{ fromUserId }` | Tandai terbaca |

Status implementasi (T-36): `message:send` membalas ack `{ ok: true, message }` atau `{ ok: false, code, message }` (kode sama dengan REST, payload tidak valid `VALIDATION_FAILED`); `message:new` dikirim ke penerima dan ke semua koneksi pengirim (klien membuang duplikat berdasarkan `id`); `message:read` ack `{ ok: true, updated }` dan hanya memicu event ke pengirim bila ada pesan yang berubah. `typing` (T-38): klien mengirim `{ toUserId, isTyping }` tanpa ack; server meneruskan `{ userId, isTyping }` hanya ke penerima (bukan ke tab pengirim). `isTyping: true` dibatasi satu per detik per pasangan (kelebihannya dibuang diam-diam), `false` selalu diteruskan dan mereset batas. Pemeriksaan teman dan blokir per event; payload buruk, bukan teman, atau diblokir diabaikan tanpa galat. Klien menganggap lawan berhenti mengetik setelah 6 detik tanpa kabar.

Presence: online bila minimal satu koneksi aktif; `users.last_seen_at` diperbarui saat koneksi terakhir putus. Label Web atau Mobile diambil dari `auth.client` saat koneksi. Pemeriksaan teman dan blokir dilakukan di server untuk setiap event, bukan hanya saat connect.

## 10. Fase 3 dan bonus

| Method | Path | Fungsi | ID |
|---|---|---|---|
| GET/POST | `/albums` | Daftar dan buat album | ALB-01 |
| POST | `/albums/:id/photos` | Unggah beberapa foto (`files[]`, maksimal 10) | ALB-01 |
| GET/POST | `/groups` | Daftar dan buat grup | GRP-01 |
| POST | `/groups/:id/join`, `/groups/:id/leave` | Gabung dan keluar | GRP-01 |
| GET/POST | `/groups/:id/posts` | Post di grup (anggota saja) | GRP-01 |
| GET/POST | `/events` | Daftar dan buat event | EVT-01 |
| PUT | `/events/:id/rsvp` | `{ status: 'GOING'|'MAYBE'|'DECLINED' }` | EVT-01 |
| GET/POST/PATCH/DELETE | `/notes`, `/notes/:id` | Catatan panjang | NOT-01 |
| GET/POST/DELETE | `/life-events` | Milestone di timeline | LIF-01 |
| GET | `/me/activity` | Activity log sendiri; `DELETE /me/activity/:type/:id` menghapus item | ACT-01 |
| GET | `/sponsored` | Satu promosi aktif untuk kolom kanan | SPN-01 |
| GET | `/announcements/active` | Banner pengumuman aktif | ADM-13 |
| GET | `/settings/public` | `{ registrationOpen, maintenanceMode }` untuk halaman login | ADM-12 |

Akun bot (BOT-01) tidak punya endpoint khusus; bot berjalan sebagai job di API yang memanggil service post dan komentar langsung.

## 11. Admin (`/api/admin/*`, semua butuh role ADMIN)

Setiap aksi tulis menyimpan satu baris `audit_logs` dalam transaksi yang sama (ADM-14). Daftar memakai pagination cursor yang sama; admin boleh melihat konten `hidden`.

Autentikasi admin memakai sesi access/refresh yang sama, tetapi endpoint login dan refresh hanya menerbitkan sesi untuk akun ber-role `ADMIN`. Admin bootstrap pertama dibuat melalui CLI API: jalankan `pnpm --filter @retrobook/api admin:create` dengan `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME`, dan `ADMIN_PASSWORD` (minimal 12 karakter) tersedia di environment; perintah menolak berjalan bila admin aktif sudah ada.

| Method | Path | Fungsi | ID |
|---|---|---|---|
| POST | `/admin/auth/login` | `{ identifier, password }`; hanya role ADMIN | ADM-01 |
| POST | `/admin/auth/refresh` | `{ refreshToken }`; refresh token user biasa ditolak | ADM-01 |
| POST | `/admin/auth/logout` | `{ refreshToken }`; mencabut sesi admin | ADM-01 |

| Method | Path | Fungsi | ID |
|---|---|---|---|
| GET | `/admin/stats` | `{ totalUsers, totalPosts, totalComments, activeUsersToday, newUsersLast7Days, pendingReports }` | ADM-02 |
| GET | `/admin/stats/series?days=14` | `{ registrationsByDay, postsByDay }`; tiap item `{ date: 'YYYY-MM-DD', count }`; `days` 1–90, default 14 | ADM-02 |
| GET | `/admin/users` | `?q=&status=&role=&cursor=` | ADM-03 |
| GET | `/admin/users/:id` | Detail termasuk jumlah laporan terhadapnya | ADM-03 |
| PATCH | `/admin/users/:id/status` | `{ status: 'ACTIVE'|'SUSPENDED'|'BANNED', reason }`; mencabut semua refresh token bila bukan ACTIVE | ADM-04 |
| PATCH | `/admin/users/:id/role` | `{ role }`; menolak menurunkan diri sendiri bila admin terakhir (422 `LAST_ADMIN`) | ADM-07, BR-14 |
| POST | `/admin/users/:id/reset-password` | Hasilkan password sementara atau tautan reset | ADM-06 |
| DELETE | `/admin/users/:id` | Soft delete; konfirmasi dua langkah di UI; menolak admin terakhir | ADM-05, BR-14 |
| GET | `/admin/posts` | `?filter=hidden|reported|deleted&q=&from=&to=&cursor=&limit=`; `reported` menampilkan laporan berstatus PENDING | ADM-08 |
| PATCH | `/admin/posts/:id` | `{ hidden: boolean }` sembunyikan atau tampilkan lagi | ADM-08 |
| DELETE | `/admin/posts/:id` | Soft delete | ADM-08 |
| POST | `/admin/posts/bulk` | `{ ids, action: 'hide'|'show'|'delete', reason? }`; maksimal 100 ID per aksi | ADM-08 |
| GET | `/admin/comments` | Filter, tanggal, pencarian, cursor dan limit sama seperti daftar post | ADM-09 |
| PATCH | `/admin/comments/:id` | `{ hidden }` sembunyikan atau tampilkan lagi | ADM-09 |
| DELETE | `/admin/comments/:id` | Soft delete | ADM-09 |
| POST | `/admin/comments/bulk` | `{ ids, action: 'hide'|'show'|'delete', reason? }`; maksimal 100 ID per aksi | ADM-09 |
| GET | `/admin/reports` | `?status=PENDING` dengan pratinjau target | ADM-10 |
| PATCH | `/admin/reports/:id` | `{ status: 'REVIEWED'|'DISMISSED', action?: 'HIDE_CONTENT'|'DELETE_CONTENT'|'SUSPEND_USER', note? }`; satu panggilan memutuskan dan mencatat (target tiga klik) | ADM-10 |
| GET/POST/DELETE | `/admin/blocked-words` | Kelola kata terlarang; kata disimpan huruf kecil dan unik | ADM-11 |
| GET/PATCH | `/admin/settings` | `maintenance_mode`, `registration_open` | ADM-12 |
| GET/POST/PATCH/DELETE | `/admin/announcements` | Kelola pengumuman; membuat satu akan membuat notifikasi `ANNOUNCEMENT` ke semua user aktif | ADM-13 |
| GET | `/admin/audit-logs` | `?adminId=&action=&from=&to=`; hanya baca, tanpa PATCH atau DELETE | ADM-14 |
| GET/PATCH | `/admin/bots`, `/admin/bots/:userId` | Aktif atau nonaktif, persona, frekuensi | ADM-15 |
| GET/POST/PATCH/DELETE | `/admin/sponsored` | Kelola promosi | ADM-16 |
| GET/PATCH | `/admin/hashtags`, `/admin/hashtags/:id` | `{ hidden }` | ADM-17 |

## 12. Pemetaan kebutuhan ke endpoint

Setiap ID Must di PRD punya setidaknya satu baris di dokumen ini; daftar lengkap pemetaan dipakai sebagai dasar [test plan](07-test-plan.md).

| Kelompok PRD | Bagian dokumen |
|---|---|
| AUTH-01 sampai 06 | 2 |
| POST-01 sampai 10 | 4.1 |
| INT-01 sampai 05 | 4.2 sampai 4.4 |
| PRF-01 sampai 06 | 3 |
| FRD-01 sampai 07, POK-01 | 5 |
| SRC-01, 02, WAL-01, 02 | 4.1, 6 |
| NTF-01, 02 | 7, 9 |
| CHT-01 sampai 04 | 8, 9 |
| ADM-01 sampai 17 | 11 |
| ALB, GRP, EVT, NOT, LIF, ACT, BOT, SPN | 10 |

## 13. Keputusan terbuka untuk API

- Poke: hanya antar teman atau terbuka untuk semua user (usulan: antar teman).
- Umur token: 15 menit access dan 30 hari refresh adalah usulan awal.
- Reset password tanpa penyedia email: admin menghasilkan password sementara (ADM-06) sampai penyedia email dipilih.
- Versi API: tidak diberi prefix `/v1` sampai ada klien di luar monorepo.
