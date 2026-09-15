# Stage 5 — P2 Improvement Plan (Kualitas & Skala, Tidak Mendesak)

**Status:** Draft — **menunggu instruksi eksekusi dari user.**
**Sumber:** Assessment P0/P1/P2 sebelumnya, tindak lanjut dari `docs/stage-5-p1-improve-plan.md` yang sudah selesai (date-in-URL, CI/CD, logging minimal; forgot-password dibangun lalu dihapus karena di luar scope).

Dokumen ini merinci 4 item P2 — peningkatan kualitas/skala yang tidak mendesak/blocking, berbeda dengan P0 (blocker) dan P1 (penting jangka pendek). Format: **Plan → Aksi → Hasil yang Diharapkan**, diisi hasil aktual setelah eksekusi (kalau/ketika disetujui).

---

## P2.1 — Pagination di List Master Data & Booking

### Plan
Halaman list Area, Activity, Organizer, dan Booking saat ini mengambil **semua baris sekaligus** tanpa batas (`select("*")` tanpa `.range()`/`.limit()`). Aman untuk sekarang (data masih sedikit), tapi berisiko melanggar NFR performa PRD §11 ("Operational page target <2 detik") begitu data bertambah banyak (misal ratusan booking setelah beberapa bulan operasional).

### Aksi
1. Tambah pagination server-side (`.range(offset, offset + pageSize - 1)`) di query Supabase untuk `areas`, `activities`, `organizers`, `bookings`.
2. Tambah kontrol UI (tombol Next/Previous atau nomor halaman) di masing-masing halaman list, konsisten dengan pola tabel yang sudah ada.
3. Pastikan search/filter yang sudah ada (misal pencarian nama di Area) tetap berfungsi bersamaan dengan pagination (reset ke halaman 1 saat filter berubah).
4. Tambah/perbarui e2e test yang relevan kalau perilaku list berubah signifikan.

### Hasil yang Diharapkan
- List tidak lagi memuat seluruh tabel sekaligus — page size wajar (misal 20-25 baris per halaman).
- Tidak ada regresi pada fitur CRUD/search yang sudah ada.
- Build + seluruh test (unit & e2e) tetap lulus.

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P2.2 — Perluas Test Coverage ke Komponen React

### Plan
Test coverage sejauh ini: unit test murni untuk `src/lib/*.ts` (availability, format) dan e2e untuk jalur kritikal end-to-end. Belum ada test khusus untuk logic di dalam komponen React sendiri (misalnya validasi form client-side yang kompleks, atau state derivation di luar apa yang kebetulan tersentuh e2e).

### Aksi
1. Identifikasi komponen dengan logic non-trivial yang belum tercakup e2e secara memadai (kandidat: validasi form Schedule/Booking dengan banyak `refine()` zod, kalkulasi kapasitas di form Booking).
2. Tambah component test (React Testing Library + Vitest, karena Vitest sudah terpasang) untuk kandidat-kandidat itu.
3. Dokumentasikan pola testing komponen ini di README/docs supaya konsisten kalau ditambah komponen baru ke depan.

### Hasil yang Diharapkan
- Cakupan test lebih dalam untuk logic form/validasi yang tidak selalu ke-trigger lewat skenario e2e "jalur bahagia".
- `bun run test` tetap satu perintah yang menjalankan semuanya (unit + component).

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P2.3 — E2E Coverage di Browser Selain Chromium (khususnya Mobile Safari)

### Plan
Seluruh e2e sejauh ini hanya jalan di Chromium (default `playwright.config.ts`). Target utama aplikasi ini mobile-first, dan mayoritas HP (terutama iPhone) pakai Safari/WebKit — engine render dan perilaku form/input yang berbeda dari Chromium bisa menyembunyikan bug yang tidak akan pernah ketahuan dari Chromium saja.

### Aksi
1. Tambah project `webkit` (dan opsional `firefox`) di `playwright.config.ts`.
2. Jalankan suite yang sudah ada terhadap WebKit, perbaiki bug/selector yang ternyata browser-specific (kalau ada).
3. Pertimbangkan apakah semua spec perlu jalan di semua browser (lebih lama) atau cukup subset kritikal (auth, scheduling, booking) — trade-off waktu CI vs cakupan.
4. Update `.github/workflows/ci.yml` kalau scope e2e berubah.

### Hasil yang Diharapkan
- Minimal jalur kritikal (login, scheduling conflict, booking) terverifikasi juga di WebKit.
- Bug spesifik-browser (kalau ada) ditemukan & diperbaiki.

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P2.4 — Alert Konflik Dashboard Lebih Proaktif

### Plan
PRD §7.2 meminta dashboard punya "Alert jika terdapat konflik atau informasi operasional". Implementasi saat ini (dari Stage 5) mendeteksi konflik jadwal (overlap di area yang sama) secara pasif — hanya terlihat kalau seseorang membuka halaman Dashboard. Tidak ada mekanisme yang lebih proaktif (misal badge notifikasi, atau sorotan visual yang lebih jelas).

### Aksi
1. Tinjau UX alert konflik yang ada di `src/app/(app)/dashboard-client.tsx` — evaluasi apakah cukup terlihat/jelas.
2. Perkuat secara visual (misal badge count di nav "Dashboard", warna/ikon peringatan yang lebih tegas) — tetap dalam batas arsitektur saat ini (tanpa notifikasi push/email, itu di luar scope MVP per PRD §21 soal model operasional bertahap).
3. Pastikan tetap konsisten dengan sumber data yang sama (exclusion constraint DB sebagai source of truth, dashboard hanya menampilkan).

### Hasil yang Diharapkan
- Konflik (kalaupun jarang terjadi, karena DB sudah mencegah secara struktural) lebih mudah diperhatikan staff/admin begitu ada.
- Tidak menambah kompleksitas infrastruktur (tidak perlu push notification service, dsb) — tetap sesuai skala MVP.

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## Urutan Eksekusi (disarankan, menunggu konfirmasi user)

1. **P2.1** (pagination) — paling berdampak ke performa nyata, dan paling mandiri untuk dikerjakan.
2. **P2.3** (WebKit e2e) — cukup mandiri, bisa mengungkap bug mobile-specific yang berharga sebelum makin banyak fitur ditambah.
3. **P2.4** (alert dashboard) — perbaikan UX kecil, mandiri.
4. **P2.2** (component test) — paling memakan waktu untuk cakupan yang didapat, cocok dikerjakan terakhir/opsional.

**Catatan:** dokumen ini murni perencanaan. Tidak ada perubahan kode yang dilakukan sampai ada instruksi eksplisit untuk mengeksekusi salah satu atau semua item di atas.
