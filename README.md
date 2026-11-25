# retrobook

Jejaring sosial **parodi** bertampilan 2014 sampai Maret 2015: user app, admin panel, dan satu API.

> **Fun project / parodi.** Proyek pembelajaran dan demo, bukan produk komersial dan tidak berafiliasi dengan situs mana pun. Semua nama, teks, dan ikon dibuat sendiri; logo sementara berupa wordmark teks.

Fitur: daftar dan login, post dengan privasi (Public, Friends, Only Me), feed, like dan komentar, pertemanan, profil dan timeline, wall post, tag, share, poke, notifikasi dan chat realtime, pencarian, hashtag dan trending, laporan konten. Admin panel: dashboard, manajemen user, moderasi post dan komentar, antrean laporan, kata terlarang, pengaturan sistem (maintenance, buka-tutup pendaftaran), pengumuman, dan audit log.

## Stack

Vue 3 + Vite (`apps/web`, `apps/admin`), NestJS (`apps/api`), Prisma + MySQL (`packages/db`), Socket.IO, PNPM workspaces. Tes: Jest (API), Vitest (web, admin), Playwright (e2e).

```text
apps/web        user app (gaya 2015)
apps/admin      admin panel (bersih, tidak retro)
apps/api        NestJS, satu modul per domain
packages/db     skema Prisma, migrasi, seed
packages/shared tipe, konstanta, tokens.css, teks antarmuka
docs/           roadmap, PRD, ERD, API spec, UI/UX, rencana tes, backlog
```

## Menjalankan (dev, tanpa Docker)

Butuh Node 22+, PNPM 9, dan MySQL 8 lokal (mis. `brew install mysql`).

```bash
cp .env.example .env              # sesuaikan DATABASE_URL dan JWT_SECRET
mysql -uroot -e "CREATE DATABASE retrobook; CREATE DATABASE retrobook_test;"
pnpm install                      # juga membangun packages/shared
pnpm --filter @retrobook/db migrate:deploy
pnpm --filter @retrobook/db seed  # data demo (lihat di bawah)
pnpm dev                          # api :3030, web :5173, admin :5174
```

Buka `http://localhost:5173` (user app) dan `http://localhost:5174` (admin). MySQL lewat Docker juga bisa: `docker compose up -d mysql mysql-test` (isi variabel `MYSQL_*` di `.env`).

## Data demo

`pnpm --filter @retrobook/db seed` membuat 30 user, 1 admin, 120 pertemanan (campuran diterima dan menunggu), 200 post (campuran privasi dan hashtag), 600 komentar, 1.000 like, 300 pesan (sebagian belum dibaca), 10 laporan, 2 pengaturan, dan 10 kata terlarang. Aman dijalankan ulang (tidak mengubah apa pun bila data sudah ada). `SEED_RESET=true` menghapus **semua** data lalu mengisi ulang; seed menolak jalan di production.

| Akun | Login | Password |
|---|---|---|
| User demo | `alice`, `bob`, `carol`, ... (30 akun) | `retrobook-demo` |
| Admin demo | `admin` (admin panel) | `retrobook-demo` |

Admin untuk lingkungan nyata dibuat dengan skrip, bukan seed:

```bash
ADMIN_EMAIL=you@example.com ADMIN_USERNAME=you ADMIN_DISPLAY_NAME="You" ADMIN_PASSWORD='min-12-karakter' \
  pnpm --filter @retrobook/api admin:create
```

## Tes dan kualitas

```bash
pnpm typecheck && pnpm lint && pnpm format:check
pnpm --filter @retrobook/db migrate:test   # wajib sebelum tes API
pnpm --filter @retrobook/api test          # integrasi API (DB retrobook_test)
pnpm --filter @retrobook/web test          # Vitest web (admin: --filter @retrobook/admin)
pnpm test:e2e                              # Playwright, termasuk skenario admin
pnpm perf:read                             # uji performa baca; lihat docs/07-test-plan.md bagian 5
```

Catatan: `pnpm lint` di akar masih melaporkan beberapa error lama di `scripts/`, `packages/db/prisma/seed.mjs`, dan satu komponen admin.

## Produksi (Docker Compose)

```bash
cp .env.production.example .env.production   # isi password MySQL dan JWT_SECRET (min. 32 karakter acak)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Web di `:8080`, admin di `:8081`, satu origin dengan proxy ke API. Dalam mode production API menolak boot bila `JWT_SECRET` lemah atau `CORS_ORIGINS` berisi `*`. Status: berkas siap dan konfigurasi tervalidasi, tetapi build image dari nol belum diuji (lihat T-62 di `docs/08-backlog.md`).

## Aturan penting

- Jangan memakai nama, logo, atau aset merek dari situs yang ditiru. Label parodi wajib di footer dan halaman register.
- Reaksi hanya **Like**; tanpa Stories atau fitur di luar PRD.
- Semua baca konten lewat `VisibilityService` (privasi, pertemanan, blokir, `hidden`, soft delete); otorisasi ditegakkan di server.
- Dokumen di `docs/` adalah sumber kebenaran: PRD untuk perilaku, ERD untuk data, API spec untuk kontrak. Panduan kerja ada di `CLAUDE.md`.

## Dokumen

[Roadmap](docs/01-roadmap.md) · [PRD](docs/02-prd.md) · [ERD](docs/03-erd.md) · [API Spec](docs/04-api-spec.md) · [User Flow](docs/05-user-flow-sitemap.md) · [UI/UX](docs/06-ui-ux-spec.md) · [Rencana Tes](docs/07-test-plan.md) · [Backlog](docs/08-backlog.md)
