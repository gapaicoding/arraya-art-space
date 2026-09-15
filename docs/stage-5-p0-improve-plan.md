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
**Ditunda** — user memilih push manual sendiri nanti, bukan dari sesi ini. P0.2 tetap bisa dijalankan karena production URL (`https://arraya-art-space.vercel.app`) sudah live dari deployment sebelumnya (RLS/database-level tidak tergantung commit frontend terbaru).

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
**✅ Selesai — RLS terverifikasi menahan dengan benar di production live.**

Dijalankan dengan user test `verify-staff@arayya.test` (role `staff`, dibuat via Supabase Admin API), login ke `https://arraya-art-space.vercel.app` sungguhan (bukan dev server):

| Aksi | Diharapkan | Hasil |
|---|---|---|
| UI halaman Area sebagai staff | Read-only, tombol Aksi/Tambah tidak muncul | ✅ Sesuai — hanya kolom data, tanpa kolom Aksi |
| INSERT langsung ke `areas` (bypass UI, pakai JWT staff) | Ditolak RLS | ✅ HTTP 403 `"new row violates row-level security policy for table areas"` |
| UPDATE langsung ke `business_hours` | Ditolak RLS (0 baris berubah) | ✅ HTTP 200 tapi `[]` baris (dikonfirmasi `open_time` tidak berubah) |
| INSERT langsung ke `activities` | Ditolak RLS | ✅ HTTP 403 |
| INSERT langsung ke `organizers` | Ditolak RLS | ✅ HTTP 403 |
| INSERT ke `schedules` (staff diizinkan) | Berhasil | ✅ HTTP 201 |

**Kesimpulan:** RLS policy admin-only write untuk Area/Activity/Organizer/Business Hours benar-benar ditegakkan di level database production, bukan cuma disembunyikan di UI — percobaan bypass langsung lewat REST API (melewati UI sepenuhnya) tetap ditolak. Staff tetap bisa membuat Schedule sesuai matriks role PRD §14.

**Cleanup:** user test dan 1 schedule test (`RLS_TEST_staff_schedule`) sudah dihapus. Terverifikasi tidak ada sisa data/user tertinggal.

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

### Simulasi Awal (Browser Viewport 390×844, bukan device fisik)

Sebagai langkah awal sebelum UAT fisik, saya jalankan sebagian checklist lewat browser dengan viewport ukuran HP terhadap URL production (pakai 1 admin test sementara, sudah dihapus setelah selesai). Hasil:

| Area yang dicek | Hasil |
|---|---|
| Halaman Login | ✅ Rapi, form & tombol proporsional |
| Dashboard (termasuk scroll ke bawah) | ✅ Semua card terbaca, bottom nav tidak menutupi konten |
| Menu "Lainnya" | ✅ List rapi, touch target besar |
| Tab Availability (grid jam) | ✅ Wrap dengan baik, badge warna terbaca |
| Dialog "+ Jadwal Baru" | ✅ Semua field terlihat/scrollable, tombol Simpan terjangkau |
| Dialog "+ Booking Baru" | ✅ Scrollable, semua field terjangkau |
| Tabel Daftar Jadwal / Master Area | ⚠️ Kolom "Status"/"Aksi" terpotong di lebar 390px, **butuh scroll horizontal** — sudah ada scrollbar dan berfungsi, tapi ini pola berulang di semua tabel (bukan blocker, tapi kurang ideal untuk mobile-first; lihat catatan di bawah) |

**Catatan:** ini simulasi viewport di browser, BUKAN pengganti device fisik asli (tidak menangkap masalah nyata seperti keyboard virtual menutupi input, perilaku scroll native iOS Safari, atau touch gesture asli). Checklist di bawah tetap perlu dijalankan Anda di HP sungguhan untuk konfirmasi final.

### Checklist UAT Mobile

URL: `https://arraya-art-space.vercel.app` — login pakai akun admin asli Anda.
Disarankan dites di **minimal 2 device**: 1 Android (Chrome) + 1 iPhone (Safari), karena browser engine beda dan e2e otomatis kita cuma cover Chromium.

**Login & Navigasi**
- [ ] Halaman login nyaman diisi di keyboard HP (input tidak tertutup keyboard, tombol "Masuk" mudah dijangkau jempol).
- [ ] Setelah login, bottom navigation (Dashboard/Jadwal/Booking/Lainnya) muncul dan semua tombol mudah disentuh (tidak kepencet ganda/salah).
- [ ] Menu "Lainnya" bisa dibuka dan berisi link ke Area/Aktivitas/Organizer/Pengaturan.

**Dashboard**
- [ ] Ringkasan (jadwal hari ini, area tersedia, booking hari ini) terbaca jelas tanpa perlu zoom.

**Jadwal (Schedule)**
- [ ] Ganti tanggal via date picker nyaman disentuh (bukan cuma bisa lewat keyboard).
- [ ] Tab "Daftar Jadwal" dan "Availability" mudah dipindah.
- [ ] Grid Availability (badge warna per jam) tidak terpotong/overflow di lebar HP.
- [ ] Form "+ Jadwal Baru" — semua field (tanggal, area, jam, aktivitas) bisa diisi tanpa dialog terpotong di layar kecil.
- [ ] Coba buat jadwal yang bentrok — pesan error muncul jelas & terbaca.

**Booking**
- [ ] Form "+ Booking Baru" nyaman diisi, dropdown Area/pilihan waktu tidak terpotong.
- [ ] List booking bisa di-scroll dan status (Pending/Confirmed/dll) terbaca jelas.
- [ ] Detail booking & tombol Batalkan mudah disentuh, dialog konfirmasi tidak terpotong.

**Master Data (Admin)**
- [ ] Tabel Area/Aktivitas/Organizer bisa di-scroll horizontal kalau kolom lebih lebar dari layar (tidak merusak layout halaman).
- [ ] Form create/edit nyaman diisi di layar kecil.

**Umum**
- [ ] Tidak ada teks/tombol yang terpotong atau tumpang tindih di orientasi portrait.
- [ ] Transisi antar halaman terasa responsif (tidak nge-lag berlebihan).

### Hasil Aktual
*(diisi setelah Anda menjalankan UAT dan melaporkan hasilnya — laporkan sebagai daftar checklist mana yang gagal beserta screenshot/deskripsi masalahnya, saya perbaiki di sesi berikutnya)*

---

## Urutan Eksekusi

1. P0.1 (push + deploy) — paling cepat, jadi prasyarat P0.2 (butuh URL production).
2. P0.2 (verifikasi RLS production) — bisa saya kerjakan begitu P0.1 selesai.
3. P0.3 (mobile UAT) — saya siapkan checklist-nya di dokumen ini, eksekusi fisiknya di tangan Anda.
