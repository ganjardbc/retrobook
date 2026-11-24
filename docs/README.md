# Dokumentasi Retro Social Network 2015 + Admin Panel

Fun project: jejaring sosial **parodi** bertampilan 2014 sampai Maret 2015, lengkap dengan user app, admin panel, dan API. Stack mengikuti Insell: Vue 3 + Vite, NestJS, Prisma, MySQL, PNPM monorepo, Socket.IO.

> Nama sementara: **retrobook**; logo belum ada (sementara wordmark teks). Proyek memakai nama, logo, dan ikon buatan sendiri, dengan label parodi di footer dan halaman register. Tidak ada halaman login yang meniru situs asli.

## Daftar dokumen

| # | Dokumen | Isi | Kapan dibuka |
|---|---|---|---|
| 01 | [Roadmap](01-roadmap.md) | Rencana 10 minggu, stack, struktur monorepo, gerbang fase, risiko | Perencanaan mingguan |
| 02 | [PRD](02-prd.md) | Tujuan, persona, scope, kebutuhan (ID dan kriteria penerimaan), aturan bisnis BR-01 sampai BR-14, risiko | Sebelum membangun fitur |
| 03 | [ERD](03-erd.md) | 28 tabel, relasi, aturan hapus, indeks, seed dan migrasi, 4 diagram | Saat menulis Prisma schema |
| 04 | [API Specification](04-api-spec.md) | Konvensi, endpoint user dan admin, event Socket.IO, format error, rate limit | Saat menulis API dan klien |
| 05 | [User Flow dan Sitemap](05-user-flow-sitemap.md) | Rute, penjaga rute, alur utama (Mermaid), matriks akses | Saat membuat router dan halaman |
| 06 | [UI/UX Spec dan Design Token](06-ui-ux-spec.md) | Token CSS, layout, komponen, referensi visual, panduan admin | Saat membuat tampilan |
| 07 | [Test Plan](07-test-plan.md) | Strategi, matriks uji per kebutuhan, tabel privasi, E2E, gerbang rilis | Saat menulis tes dan sebelum rilis |
| 08 | [Backlog](08-backlog.md) | Tugas per minggu, ukuran, keputusan terbuka | Setiap hari |

Versi PDF dari Roadmap, PRD, dan ERD ada di [pdf/](pdf/) untuk dibaca di ponsel. Diagram ERD (PNG dan sumber Graphviz) ada di [assets/erd/](assets/erd/).

## Kunci rujukan silang

- **ID kebutuhan** (AUTH, POST, INT, PRF, FRD, NTF, CHT, POK, SRC, WAL, ADM, UX, ALB, GRP, EVT, NOT, LIF, ACT, BOT, THM, SPN) berasal dari PRD dan dipakai ulang di API, tes, dan backlog.
- **Aturan bisnis** BR-01 sampai BR-14 ada di PRD bagian 8. Aturan privasi harus ditegakkan di server pada setiap query (R-03).
- **Perubahan**: bila skema berubah, perbarui ERD dan API spec; bila perilaku berubah, perbarui PRD dulu. Bila ada selisih antar dokumen, PRD menang untuk perilaku, ERD untuk data, API spec untuk kontrak.

## Status dan keputusan terbuka

Semua dokumen adalah **draf 1**. Keputusan yang masih terbuka dikumpulkan di [Backlog](08-backlog.md) (bagian "Keputusan yang harus diambil"), terutama logo, bahasa antarmuka, dan apakah hanya demo lokal atau dibuka publik. Nilai visual di UI spec (`~`) perlu diukur dari tangkapan layar referensi sebelum dikunci.

## Urutan baca yang disarankan

1. README ini, lalu Roadmap untuk gambaran besar.
2. PRD, lalu ERD.
3. API spec dan User Flow berdampingan.
4. UI/UX spec sebelum menyentuh komponen.
5. Test plan dan Backlog saat mulai bekerja.
