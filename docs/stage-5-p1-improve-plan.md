# Stage 5 — P1 Improvement Plan (Stabilitas Operasional Jangka Pendek)

**Status:** Draft — dieksekusi setelah dokumen ini dibuat.
**Sumber:** Assessment P0/P1/P2 sebelumnya (lihat riwayat percakapan), tindak lanjut dari `docs/stage-5-p0-improve-plan.md` yang sudah selesai (push, RLS production, mobile UAT).

Dokumen ini merinci 4 item P1 — penting untuk kestabilan operasional jangka pendek, walau bukan blocker MVP seperti P0. Format: **Plan → Aksi → Hasil yang Diharapkan**, diisi hasil aktual setelah eksekusi.

---

## P1.1 — Tanggal Terpilih di Halaman Jadwal Persist di URL

### Plan
Saat ini tanggal yang dipilih di halaman Jadwal (`/schedule`) hanya tersimpan di state React (`useState`), bukan di URL. Akibatnya: reload halaman, share link, atau tombol back/forward browser selalu kembali ke tanggal hari ini, bukan tanggal yang sedang dilihat staff. Ditemukan saat sesi testing sebelumnya.

### Aksi
1. Ubah `src/app/(app)/schedule/schedule-client.tsx` supaya tanggal terpilih disinkronkan ke query param URL (`?date=YYYY-MM-DD`) via `useRouter`/`useSearchParams` dari `next/navigation`.
2. Saat halaman dimuat dengan query param `date` di URL, gunakan itu sebagai tanggal awal (bukan selalu hari ini).
3. Saat user ganti tanggal, update URL (`router.replace`, bukan `push`, supaya tidak membanjiri history browser).
4. Pastikan tidak merusak alur data fetching yang sudah ada (`loadSchedules`, `useMemo` availability) — cukup ubah sumber nilai awal `date` state.

### Hasil yang Diharapkan
- URL berubah jadi `/schedule?date=2026-09-20` saat user pilih tanggal itu.
- Reload halaman di URL tersebut tetap menampilkan tanggal yang sama (bukan balik ke hari ini).
- Semua test unit + e2e yang sudah ada tetap lulus (terutama `scheduling.spec.ts`, `availability.spec.ts`, `booking.spec.ts` yang bergantung pada perilaku tanggal).

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P1.2 — CI/CD Otomatis (GitHub Actions)

### Plan
Test suite (unit + e2e) yang sudah dibangun di Stage 5 testing hanya bisa dijalankan manual sejauh ini. Tanpa CI, regresi ke depan (perubahan kode yang tidak sengaja merusak fitur lama) tidak akan terdeteksi otomatis sebelum di-merge/deploy.

### Aksi
1. Buat `.github/workflows/ci.yml` yang jalan otomatis di setiap push & pull request ke `main`:
   - Install dependencies (`bun install`).
   - Jalankan unit test (`bun run test`).
   - Jalankan `bun run build` (pastikan production build tetap sukses).
   - (Opsional, dipertimbangkan terpisah) e2e test — perlu env var Supabase sebagai GitHub Secrets karena e2e jalan terhadap project Supabase live; kalau secrets belum di-setup di GitHub repo settings, e2e job di-skip dulu dengan catatan jelas, bukan gagal diam-diam.
2. Dokumentasikan di README bagian mana yang perlu Anda setup manual di GitHub (menambahkan repository secrets untuk env Supabase) supaya e2e job bisa aktif.

### Hasil yang Diharapkan
- Setiap push/PR ke `main` otomatis menjalankan unit test + build check.
- Kalau ada yang gagal, GitHub menampilkan status merah di PR/commit — mencegah regresi masuk tanpa disadari.
- e2e job tersedia sebagai workflow tapi jelas didokumentasikan butuh secrets tambahan dari Anda untuk aktif penuh (karena menyentuh database Supabase live, tidak boleh auto-jalan tanpa kontrol eksplisit Anda atas credential mana yang dipakai).

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P1.3 — Flow Forgot Password

### Plan
Saat ini hanya ada halaman login (email+password), tidak ada jalan resmi kalau admin/staff lupa password — satu-satunya cara reset adalah lewat Supabase Dashboard manual. Ini akan jadi masalah operasional begitu ada lebih dari 1-2 user.

### Aksi
1. Tambah link "Lupa password?" di halaman `/login`.
2. Buat halaman baru `/forgot-password` — form email, memanggil `supabase.auth.resetPasswordForEmail()` dengan `redirectTo` mengarah ke halaman reset di app ini.
3. Buat halaman `/reset-password` — form password baru, memproses sesi reset dari link email Supabase, memanggil `supabase.auth.updateUser({ password })`.
4. Pastikan alurnya sesuai konfigurasi default Supabase Auth (redirect URL perlu terdaftar di Supabase Dashboard → Authentication → URL Configuration — ini bagian yang perlu Anda konfirmasi/aktifkan manual di dashboard, karena saya tidak seharusnya mengubah setting auth project tanpa sepengetahuan Anda).

### Hasil yang Diharapkan
- User bisa klik "Lupa password?" → masukkan email → dapat email reset dari Supabase → set password baru → login normal.
- Tidak ada perubahan pada RLS/security model.

### Hasil Aktual
*(diisi setelah eksekusi)*

---

## P1.4 — Monitoring / Error Tracking Production

### Plan
Error boundary sudah ada dari Stage 5 (menampilkan halaman error yang ramah), tapi tidak ada visibility ke saya/Anda kalau terjadi error di production setelah user asli memakainya — butuh service eksternal (misal Sentry) untuk logging terstruktur.

### Aksi
**Ini butuh keputusan dan akun Anda** — saya tidak bisa membuat akun Sentry (atau layanan sejenis) atas nama Anda. Opsi:
1. Kalau Anda sudah/mau punya akun Sentry (gratis untuk skala kecil): beri saya DSN key-nya, saya integrasikan `@sentry/nextjs` ke project.
2. Kalau belum mau pakai service eksternal dulu: saya bisa siapkan logging minimal (console.error terstruktur di server actions/error boundary) sebagai langkah awal murah, tanpa dependency eksternal — bukan pengganti monitoring sungguhan, tapi lebih baik dari tidak ada apa-apa.

### Hasil yang Diharapkan
*(tergantung keputusan Anda — lihat Aksi di atas)*

### Hasil Aktual
*(diisi setelah keputusan Anda & eksekusi)*

---

## Urutan Eksekusi

1. **P1.1** (date di URL) — paling mandiri, tidak butuh keputusan/akun eksternal apa pun, langsung eksekusi.
2. **P1.2** (CI/CD) — mandiri untuk unit test + build; bagian e2e perlu Anda tambahkan GitHub Secrets belakangan.
3. **P1.3** (forgot password) — mandiri untuk kode aplikasi; perlu konfirmasi Anda soal redirect URL di Supabase Dashboard.
4. **P1.4** (monitoring) — **perlu keputusan Anda dulu** (pakai Sentry atau logging minimal) sebelum saya eksekusi.
