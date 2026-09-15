# Stage 5 — P0 Action Plan (Blocker sebelum "Siap Operasional")

**Status:** Draft — dieksekusi setelah dokumen ini disetujui.
**Sumber:** Tindak lanjut dari `docs/stage-5-testing-plan.md` dan assessment P0/P1/P2 di sesi sebelumnya.

Dokumen ini merinci 3 item P0 yang harus selesai sebelum MVP benar-benar bisa diklaim "siap operasional" sesuai PRD §20. Setiap item ditulis dengan format **Plan → Aksi → Hasil yang Diharapkan**, dan diisi hasil aktualnya setelah eksekusi.

---

## P0.1 — Push ke GitHub & Deploy Production ke Vercel

### Plan
Dua commit baru (bug fix availability/race-condition + test suite) masih lokal, belum di-push. Repo GitHub (`gapaicoding/arraya-art-space`) sudah terhubung ke project Vercel yang sudah pernah dibuat dan deploy sebelumnya (auto-deploy aktif). Cukup push, lalu pantau/konfirmasi deployment baru berhasil.

### Aksi
1. `git status` untuk pastikan tidak ada perubahan lain yang belum sengaja ter-commit.
2. `git push origin main`.
3. Pantau status deployment (lewat Vercel dashboard — user perlu cek langsung, atau saya cek via `vercel` CLI kalau tersedia/login).
4. Setelah deploy sukses, buka URL production dan verifikasi halaman utama (`/login`) bisa dimuat tanpa error.

### Hasil yang Diharapkan
- Commit baru muncul di GitHub, branch `main`.
- Vercel otomatis trigger build baru dan berhasil (status "Ready").
- URL production bisa diakses dan menampilkan halaman login tanpa error.

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P0.2 — Verifikasi RLS End-to-End di Production Live

### Plan
RLS sudah ditinjau by-code dan diuji lewat e2e terhadap Supabase project yang sama, tapi belum pernah diverifikasi lewat UI **production** (bukan dev server) dengan akun staff sungguhan. Tujuannya memastikan policy admin-only write benar-benar menahan staff di build production, bukan cuma di dev mode.

### Aksi
1. Buat 1 user test sementara dengan role `staff` lewat Supabase Admin API (prefix email jelas, misal `verify-staff@arayya.test`), tidak menyentuh user admin asli.
2. Login sebagai staff itu di URL **production** (bukan localhost).
3. Verifikasi manual (lewat browser tool):
   - Staff bisa lihat Area/Activity/Organizer/Business Hours (read-only, tombol create/edit tidak muncul).
   - Staff bisa membuat Schedule dan Booking.
   - Coba akses langsung (kalau memungkinkan lewat DevTools/network request) percobaan write ke tabel `areas` sebagai staff — harus ditolak RLS di level database, bukan cuma disembunyikan di UI.
4. Hapus user test dan data apa pun yang dibuat selama verifikasi setelah selesai.

### Hasil yang Diharapkan
- Staff production hanya bisa read di master data, RLS menahan write attempt di level DB (bukan cuma UI yang menyembunyikan tombol).
- Tidak ada sisa data/user test tertinggal di database setelah verifikasi.

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P0.3 — Mobile UAT di Device Fisik Asli

### Plan
Ini **tidak bisa saya eksekusi sendiri** — saya tidak punya akses ke perangkat HP fisik. Bagian saya hanya menyiapkan checklist UAT yang jelas dan ringkas supaya Anda (atau staff Arayya) bisa menjalankannya sendiri di HP, lalu melaporkan temuan (kalau ada) balik ke saya untuk diperbaiki.

### Aksi
1. Saya susun checklist UAT (halaman apa saja yang dicek, skenario apa yang dicoba, di device/browser apa).
2. Anda (atau staff) menjalankan checklist itu di HP asli (disarankan minimal 1 device Android + 1 device iOS/Safari, karena e2e otomatis kita sejauh ini hanya Chromium desktop-simulated).
3. Temuan/bug dari UAT dikirim balik ke saya untuk diperbaiki di sesi berikutnya.

### Hasil yang Diharapkan
- Checklist UAT tersedia dan jelas (dilampirkan di dokumen ini setelah dibuat).
- Status: **menunggu Anda menjalankan UAT** — bagian ini tidak bisa saya tandai selesai sendiri.

### Hasil Aktual
*(diisi setelah Anda menjalankan UAT dan melaporkan hasilnya)*

---

## Urutan Eksekusi

1. P0.1 (push + deploy) — paling cepat, jadi prasyarat P0.2 (butuh URL production).
2. P0.2 (verifikasi RLS production) — bisa saya kerjakan begitu P0.1 selesai.
3. P0.3 (mobile UAT) — saya siapkan checklist-nya di dokumen ini, eksekusi fisiknya di tangan Anda.
