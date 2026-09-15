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
**✅ Selesai.** `schedule-client.tsx` dan `schedule/page.tsx` diubah: tanggal disinkronkan ke `?date=YYYY-MM-DD` via `router.replace` (tidak membanjiri history), server component membaca `searchParams.date` (divalidasi format) sebagai `initialDate`. Build lolos, 23/23 unit test dan 11/11 e2e tetap lulus tanpa perubahan pada test itu sendiri.

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
**✅ Selesai.** `.github/workflows/ci.yml` dibuat dengan 2 job:
- `unit-and-build` — jalan otomatis tanpa setup tambahan (unit test + build, pakai env var placeholder karena tidak ada network call saat build).
- `e2e` — gated di belakang repository variable `E2E_ENABLED=true` + 3 secrets Supabase, supaya tidak menyentuh database live tanpa persetujuan eksplisit Anda.

README diperbarui dengan bagian "CI" yang menjelaskan cara mengaktifkan job e2e. YAML sudah divalidasi (parse via js-yaml, sintaks benar). **Catatan:** job ini belum pernah benar-benar dijalankan oleh GitHub Actions (baru aktif begitu Anda push commit ke `main`) — perlu dikonfirmasi statusnya di tab Actions repo setelah push.

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
**⚠️ Diimplementasikan, lalu dihapus kembali — di luar scope MVP.** Fitur sempat dibangun dan diverifikasi jalan (form forgot-password memanggil `resetPasswordForEmail` tanpa error, halaman reset-password menampilkan pesan "link tidak valid" yang benar tanpa sesi recovery, build & seluruh test tetap lulus).

Namun setelah didiskusikan: aplikasi ini **tidak punya self-service signup** (sesuai PRD — Non-Goals MVP, akun cuma dibuat Admin lewat Supabase Dashboard). Fitur forgot-password hanya berguna untuk user yang **sudah** punya akun tapi lupa password — bukan pengganti pendaftaran akun baru. Mengingat jumlah user masih sangat sedikit di tahap MVP ini dan reset manual lewat Supabase Dashboard oleh Admin masih sangat memadai, fitur ini diputuskan **di luar scope MVP** dan dihapus kembali (`src/app/forgot-password/`, `src/app/reset-password/`, link "Lupa password?" di `/login`, dan entry terkait di `middleware.ts` — semua dikembalikan seperti semula). Build & seluruh test tetap lulus setelah revert.

**Catatan untuk ke depan:** kalau nanti dibutuhkan (misal jumlah staff sudah banyak dan reset manual oleh Admin jadi beban operasional), fitur ini bisa dibangun ulang — kode sebelumnya sudah terbukti jalan, tinggal diulang polanya.

---

## P1.4 — Monitoring / Error Tracking Production

### Plan
Error boundary sudah ada dari Stage 5 (menampilkan halaman error yang ramah), tapi tidak ada visibility ke saya/Anda kalau terjadi error di production setelah user asli memakainya — butuh service eksternal (misal Sentry) untuk logging terstruktur.

### Aksi
**Ini butuh keputusan dan akun Anda** — saya tidak bisa membuat akun Sentry (atau layanan sejenis) atas nama Anda. Opsi:
1. Kalau Anda sudah/mau punya akun Sentry (gratis untuk skala kecil): beri saya DSN key-nya, saya integrasikan `@sentry/nextjs` ke project.
2. Kalau belum mau pakai service eksternal dulu: saya bisa siapkan logging minimal (console.error terstruktur di server actions/error boundary) sebagai langkah awal murah, tanpa dependency eksternal — bukan pengganti monitoring sungguhan, tapi lebih baik dari tidak ada apa-apa.

**Keputusan Anda: opsi 2 (logging minimal).**

### Hasil yang Diharapkan
- Helper `logError()` terpusat, log JSON terstruktur (timestamp, scope, message, stack) ke `console.error`.
- Dipasang di kedua error boundary (`error.tsx`, `(app)/error.tsx`) dan di semua 7 halaman server yang fetch data dari Supabase — sebelumnya error dari query itu diam-diam tertelan lewat fallback `?? []`.

### Hasil Aktual
**✅ Selesai.** `src/lib/logger.ts` dibuat dan dipasang di 2 error boundary + 7 server page (`areas`, `activities`, `organizers`, `business-hours`, `bookings`, `schedule`, dashboard). Build lolos, 23/23 unit test dan 11/11 e2e tetap lulus.

**Keterbatasan yang didokumentasikan (bukan bug, sesuai ekspektasi opsi minimal):** error dari halaman server (Server Components) akan muncul di Vercel Runtime Logs — bisa dicek kapan saja. Error dari sisi client (kebanyakan operasi CRUD di app ini memang client-side lewat Supabase browser client) hanya muncul di console browser user saat error itu terjadi — tidak ada yang otomatis memberi tahu Anda/saya. Untuk visibility production yang sesungguhnya (notifikasi real-time saat ada error), tetap perlu upgrade ke layanan seperti Sentry di kemudian hari (opsi 1 di atas, kapan saja siap).

---

## Urutan Eksekusi

1. **P1.1** (date di URL) — paling mandiri, tidak butuh keputusan/akun eksternal apa pun, langsung eksekusi.
2. **P1.2** (CI/CD) — mandiri untuk unit test + build; bagian e2e perlu Anda tambahkan GitHub Secrets belakangan.
3. **P1.3** (forgot password) — mandiri untuk kode aplikasi; perlu konfirmasi Anda soal redirect URL di Supabase Dashboard.
4. **P1.4** (monitoring) — **perlu keputusan Anda dulu** (pakai Sentry atau logging minimal) sebelum saya eksekusi.
