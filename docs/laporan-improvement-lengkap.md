# Laporan Improvement — Arayya Art & Space Activity & Space Management

**Disusun:** 15 September 2026
**Cakupan:** Seluruh pekerjaan improvement setelah MVP awal (Stage 0–5) selesai dibangun — testing, perbaikan bug, hardening production, dan peningkatan kualitas.
**Tujuan dokumen:** Rekap detail untuk kebutuhan pribadi/arsip — mencatat apa yang dikerjakan, kenapa, dan hasilnya.

---

## 1. Ringkasan Eksekutif

Setelah MVP (Stage 0–5) selesai dibangun dan di-deploy ke production (`https://arraya-art-space.vercel.app`), dilakukan serangkaian pekerjaan improvement dalam 3 tahap prioritas (P0 → P1 → visual/branding), mencakup:

- **Testing menyeluruh**: 23 unit test + 11 e2e test, semuanya lulus.
- **2 bug produksi asli ditemukan & diperbaiki** lewat proses testing (bukan cuma test-only fixes).
- **1 bug tambahan ditemukan & diperbaiki** lewat UAT manual di device fisik (lag akibat animasi background).
- **Verifikasi keamanan (RLS)** dikonfirmasi menahan dengan benar di database production, bukan cuma disembunyikan di UI.
- **4 item peningkatan stabilitas (P1)**: URL persistence, CI/CD, minimal error logging, dan sempat dibangun+dihapus-nya fitur forgot-password (keputusan sadar, bukan kegagalan).
- **Branding**: logo resmi Arayya diterapkan di login, sidebar, dan favicon browser.
- **Dokumen plan P2** sudah disiapkan (4 item), menunggu instruksi eksekusi.

Total: **20 commit** dihasilkan selama fase improvement ini (di luar commit MVP awal), seluruhnya lolos build + test sebelum di-commit.

---

## 2. Timeline & Tahapan

| Tahap | Fokus | Status |
|---|---|---|
| Testing Stage 5.1–5.8 | Unit test + E2E test menyeluruh | ✅ Selesai — 23/23 unit, 11/11 e2e |
| P0 (blocker operasional) | Push+deploy, verifikasi RLS production, mobile UAT | ✅ Selesai (3/3 item) |
| P1 (stabilitas jangka pendek) | Date-in-URL, CI/CD, forgot-password, logging | ✅ Selesai (4/4 item, 1 di-revert dengan sengaja) |
| Branding | Logo & favicon | ✅ Selesai |
| P2 (kualitas/skala) | Pagination, test coverage, WebKit, alert dashboard | 📝 Direncanakan, **belum dieksekusi** |

---

## 3. Detail: Testing Menyeluruh (Stage 5.1–5.8)

**Dokumen sumber:** `docs/stage-5-testing-plan.md`

### 3.1 Unit Test
- **23/23 lulus** menggunakan Vitest.
- `src/lib/availability.test.ts` (15 test) — menguji engine availability: hari tutup, area nonaktif, tipe schedule (internal/booking/blocked), schedule dibatalkan tidak mengunci slot, kondisi batas waktu.
- `src/lib/format.test.ts` (8 test) — menguji konversi timezone Asia/Jakarta, termasuk kasus batas jam 00:30 yang rawan salah tanggal.

### 3.2 E2E Test (Playwright)
- **11/11 lulus**, dijalankan terhadap database Supabase live (bukan mock), dengan data ber-prefix `E2E_TEST_` yang otomatis dibersihkan setelah tiap run.
- Cakupan: auth (login benar/salah), role permission (admin vs staff), CRUD master data (Area/Activity/Organizer), business hours, scheduling + deteksi konflik, availability grid, booking flow + validasi kapasitas.

### 3.3 Bug Produksi Asli yang Ditemukan Lewat Testing

**Bug #1 — Availability grid selalu kosong (kritikal, sudah ada sejak awal)**
- **Penyebab:** `business_hours.open_time`/`close_time` dari Postgres berformat `"09:00:00"` (dengan detik), tapi `buildHourSlots()` di `src/lib/availability.ts` mem-parsing dengan pattern `"HH:mm"` (tanpa detik) → menghasilkan `Invalid Date` → loop pembuatan slot jam tidak pernah berjalan.
- **Dampak:** Tab "Availability" di halaman Jadwal **tidak pernah menampilkan slot jam apapun**, untuk area manapun, di tanggal manapun — sejak fitur ini pertama dibuat.
- **Perbaikan:** Normalisasi string waktu (`.slice(0, 5)`) sebelum parsing.
- **Bug terkait:** Validasi jam operasional di form Schedule juga salah (`"09:00" < "09:00:00"` sebagai perbandingan string selalu `true`), menyebabkan schedule yang mulai **persis** di jam buka salah ditolak. Diperbaiki sekaligus.

**Bug #2 — Race condition saat ganti tanggal cepat**
- **Penyebab:** `loadSchedules()` di `schedule-client.tsx` tidak melindungi dari respons yang datang tidak berurutan (out-of-order). Kalau user ganti tanggal dengan cepat, fetch untuk tanggal lama yang masih berjalan bisa selesai belakangan dan menimpa balik data tanggal baru yang sudah benar.
- **Perbaikan:** Token-guard (`latestRequestedDate` ref) yang mengabaikan response basi.

Kedua bug di atas ditemukan justru **setelah** unit test individual lulus semua — unit test menguji logic murni dengan data format `"HH:mm"` yang "bersih", sementara data asli dari Postgres berformat `"HH:mm:ss"`. Ini jadi pelajaran: e2e test terhadap data real (bukan cuma mock) penting justru untuk menangkap gap semacam ini.

---

## 4. Detail: P0 — Blocker Operasional

**Dokumen sumber:** `docs/stage-5-p0-improve-plan.md`

### P0.1 — Push & Deploy
Push ke GitHub (`main`) dan konfirmasi auto-deploy Vercel berhasil.

### P0.2 — Verifikasi RLS End-to-End di Production Live
Diuji langsung terhadap production (bukan dev server) dengan user test role `staff`:

| Aksi | Hasil |
|---|---|
| INSERT langsung ke `areas` (bypass UI, JWT staff) | ✅ Ditolak — HTTP 403 |
| UPDATE langsung ke `business_hours` | ✅ Ditolak — 0 baris berubah |
| INSERT langsung ke `activities`/`organizers` | ✅ Ditolak — HTTP 403 |
| INSERT ke `schedules` (staff diizinkan) | ✅ Berhasil — HTTP 201 |

**Kesimpulan penting:** RLS ditegakkan di **level database**, bukan cuma UI yang menyembunyikan tombol — percobaan bypass langsung lewat REST API tetap ditolak. Ini konfirmasi keamanan yang solid.

### P0.3 — Mobile UAT
- Simulasi awal via browser viewport HP (390×844) terhadap production — semua rapi (login, dashboard, menu, dialog, grid availability).
- **UAT fisik dijalankan langsung oleh user di device mobile asli** — hasil bagus, dengan **1 temuan**: sedikit lag.

**Bug #3 — Lag akibat animasi background (ditemukan lewat UAT fisik)**
- **Penyebab:** 3 elemen dekoratif "blob" (lingkaran blur radius 120-130px) di `AppShell.tsx`, posisi `fixed`, dianimasikan **tanpa henti** (`animation: ... infinite`) di setiap halaman. Kombinasi blur berat + animasi tanpa henti + posisi fixed memaksa GPU merender ulang efek blur terus-menerus.
- **Perbaikan (2 tahap):** Awalnya animasi dimatikan khusus mobile (`@media max-width: 768px`), lalu atas permintaan user diperluas jadi mati di **semua ukuran layar** (blob jadi elemen statis permanen) — keyframes yang jadi tidak terpakai juga dibersihkan.

---

## 5. Detail: P1 — Stabilitas Jangka Pendek

**Dokumen sumber:** `docs/stage-5-p1-improve-plan.md`

### P1.1 — Tanggal Persist di URL ✅
Tanggal terpilih di halaman Jadwal disinkronkan ke `?date=YYYY-MM-DD` (via `router.replace`, tidak membanjiri history browser). Reload/share link sekarang mempertahankan tanggal yang dipilih, bukan selalu balik ke hari ini.

### P1.2 — CI/CD (GitHub Actions) ✅
`.github/workflows/ci.yml` dengan 2 job:
- `unit-and-build` — jalan otomatis di setiap push/PR (unit test + production build).
- `e2e` — gated di belakang `E2E_ENABLED=true` + 3 secrets Supabase, supaya tidak menyentuh database live tanpa persetujuan eksplisit.

### P1.3 — Forgot Password: Dibangun, Lalu Dihapus (keputusan sadar) ⚠️→revert
- Fitur lengkap sempat dibangun (`/forgot-password`, `/reset-password`, integrasi Supabase Auth) dan **terverifikasi berfungsi**.
- Setelah didiskusikan: aplikasi ini tidak punya self-service signup (akun cuma dibuat Admin), sehingga forgot-password hanya berguna untuk user yang **sudah** punya akun. Dengan jumlah user masih sangat sedikit, reset manual oleh Admin lewat Supabase Dashboard dinilai masih cukup memadai.
- **Diputuskan di luar scope MVP** dan dihapus kembali sepenuhnya (halaman, link, middleware entry). Kode sebelumnya sudah terbukti jalan — bisa dibangun ulang kapan saja kalau kebutuhan berubah.

### P1.4 — Minimal Error Logging ✅
`src/lib/logger.ts` — helper `logError()` yang menulis log JSON terstruktur (timestamp, scope, message, stack) ke `console.error`. Dipasang di:
- 2 error boundary (`error.tsx`, `(app)/error.tsx`).
- 7 halaman server yang fetch data Supabase (sebelumnya error di-fetch itu **diam-diam tertelan** lewat fallback `?? []` — sekarang minimal terlihat di Vercel Runtime Logs).

**Keterbatasan yang didokumentasikan secara sadar:** ini BUKAN pengganti monitoring sungguhan (Sentry dkk) — tidak ada notifikasi real-time. Keputusan user: pakai opsi minimal ini dulu, upgrade ke Sentry nanti kalau dibutuhkan.

---

## 6. Detail: Branding & Visual

### Logo Resmi Arayya
Logo asli (`public/logo-arayya.jpg`, di-rename dari nama berspasi) diterapkan menggantikan badge teks "A" gradient di:
- Halaman Login.
- Sidebar desktop (AppShell).

### Favicon
`metadata.icons` di `src/app/layout.tsx` diarahkan ke logo yang sama — tab browser sekarang menampilkan logo Arayya, bukan favicon default Next.js. Diverifikasi lewat inspeksi `<link rel="icon">` di browser.

---

## 7. Detail: Rencana P2 (Belum Dieksekusi)

**Dokumen sumber:** `docs/stage-5-p2-improve-plan.md`

Disiapkan sebagai dokumen plan saja, menunggu instruksi:

| # | Item | Kenapa Penting |
|---|---|---|
| P2.1 | Pagination di list Area/Activity/Organizer/Booking | Cegah masalah performa (PRD NFR <2 detik) saat data bertambah banyak |
| P2.2 | Perluas test coverage ke komponen React | Logic validasi form kompleks belum tentu ter-cover e2e "jalur bahagia" |
| P2.3 | E2E test di WebKit (Safari) selain Chromium | Target mobile-first, mayoritas HP pakai Safari — beda engine bisa sembunyikan bug |
| P2.4 | Alert konflik dashboard lebih proaktif | PRD §7.2 minta alert, implementasi sekarang masih pasif |

---

## 8. Ringkasan Commit

Selama fase improvement ini, dihasilkan commit-commit berikut (kronologis, semua sudah lolos build + test sebelum commit):

1. `docs: add Stage 5 P0 improvement plan`
2. `docs: record P0.2 RLS production verification results, add mobile UAT checklist`
3. `docs: record P0.3 mobile viewport simulation results`
4. `docs: record P0.3 physical device UAT result and the lag fix`
5. `perf: disable decorative blob animation on mobile viewports`
6. `perf: disable decorative blob animation on all viewports, not just mobile`
7. `feat: use Arayya brand logo instead of text badge`
8. `docs: add Stage 5 P1 improvement plan`
9. `feat: persist selected schedule date in the URL (?date=)`
10. `ci: add GitHub Actions workflow for unit tests, build, and opt-in e2e`
11. `feat: add forgot-password / reset-password flow`
12. `feat: add minimal structured error logging (P1.4)`
13. `docs: record P1.1-P1.4 execution results`
14. `revert: remove forgot-password/reset-password flow (out of MVP scope)`
15. `docs: add Stage 5 P2 improvement plan (not yet executed)`
16. `feat: use Arayya logo as the browser tab favicon`

(Ditambah beberapa commit dari fase testing Stage 5.1–5.8 sebelumnya: setup Vitest/Playwright, 2 bug fix availability/race-condition.)

---

## 9. Status Akhir & Yang Masih Perlu Diperhatikan

✅ **Selesai & terverifikasi:**
- Testing menyeluruh (unit + e2e), semua lulus.
- 3 bug produksi asli ditemukan & diperbaiki (availability parsing, race condition, blob lag).
- RLS terverifikasi aman di production (level database, bukan cuma UI).
- CI/CD dasar aktif untuk unit test + build.
- Branding logo diterapkan konsisten.

⚠️ **Perlu tindakan/keputusan Anda:**
- Push commit terbaru ke GitHub kalau belum (cek `git status`/`git log` vs `origin/main`).
- Kalau mau aktifkan e2e di CI: tambahkan secrets + `E2E_ENABLED=true` di GitHub repo settings.
- P2 masih berupa rencana — beri instruksi kapan mau dieksekusi (semua sekaligus atau bertahap).
- Pertimbangkan kapan waktunya upgrade dari logging minimal ke monitoring sungguhan (Sentry) — sesuai catatan di P1.4.

---

*Dokumen ini adalah arsip/rekap — untuk detail teknis lengkap tiap item, rujuk ke dokumen sumber masing-masing di folder `docs/` (`stage-5-testing-plan.md`, `stage-5-p0-improve-plan.md`, `stage-5-p1-improve-plan.md`, `stage-5-p2-improve-plan.md`).*
