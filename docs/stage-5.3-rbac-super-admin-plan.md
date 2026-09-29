# Stage 5.3 — RBAC 3 Tier (Super Admin) + Restrukturisasi Nav

## Context

Owner minta sistem role dinaikkan dari 2 tier (`admin`/`staff`) menjadi 3
tier, mengikuti pola yang sudah terbukti jalan di aplikasi bisnis lain milik
owner (lovinmilkweb — dashboard operasional Lovin Milk):

- **Super Admin** — owner. Kontrol penuh, termasuk manajemen role pengguna
  lain dan hard delete.
- **Admin** — lini HRD dan SPV bidang/captain. Kelola master data,
  approve/reject, archive/restore.
- **Staff** — junior staff & karyawan lini terbawah. Input operasional
  harian (create + edit), tapi tidak bisa archive/hard delete.

Perubahan ini jadi fondasi untuk 2 modul baru yang direncanakan di
Stage 9 (Rekap Penjualan & Rekap Pengeluaran) — modul itu butuh 3-tier
permission sebelum bisa dibangun. Stage ini murni permission + struktur
nav, **tidak** membuat tabel `sales_transactions`/`expense_items` baru
(itu scope Stage 9).

Dari diskusi dengan owner, permission model untuk create/edit di modul
operasional (termasuk Stage 9 nanti) mengikuti pola lovinmilk: **staff
boleh create + edit entri siapa saja** (bukan cuma miliknya sendiri) —
lebih sesuai realita shift kerja bergantian, dan lebih cepat diimplementasi
dibanding model ownership per-baris. Archive/restore dibatasi admin ke
atas, hard delete dibatasi super admin saja.

Owner juga mengasumsikan (belum dites ke staff langsung, tapi diputuskan
untuk diikuti seperti lovinmilk): staff **boleh** melihat data finansial
ringkas di Dashboard (omzet, total pengeluaran, estimasi profit) — bukan
cuma admin. Ini beda dari asumsi awal yang lebih konservatif; kalau nanti
ternyata bermasalah secara operasional, tinggal pindahkan card finansial
itu ke belakang guard `admin`+ tanpa perlu ubah struktur halaman.

## Scope

**Termasuk:**

1. Migrasi kolom `profiles.role`: tambah nilai `super_admin` ke CHECK
   constraint (`admin` \| `staff` \| `super_admin`).
2. Redefine helper `is_admin()` supaya `super_admin` otomatis lolos semua
   policy yang sudah pakai `is_admin()` (super admin mewarisi hak admin) —
   **tanpa perlu menyentuh setiap RLS policy satu per satu**. Tambah helper
   baru `is_super_admin()` untuk policy yang butuh strict super-admin-only
   (mis. `settings/users` role management, hard delete).
3. Tulis ulang `src/lib/auth-context.tsx` dari `{ isAdmin: boolean }`
   menjadi model permission eksplisit ala `ROUTE_CAPABILITIES` (pola dari
   lovinmilk `src/lib/permissions.ts`), supaya nambah role/capability baru
   di masa depan tidak butuh ubah banyak file sekaligus.
4. Restrukturisasi nav sidebar (`AppShell.tsx`) + menu "Lainnya"
   (`more/page.tsx`) dari 2 grup (Operasional/Pengaturan) menjadi 3 grup:
   **Operasional**, **Ringkasan & Analitik** (baru — isinya cuma
   `/app/analytics` untuk saat ini; slot untuk modul Stage 9 nanti),
   **Pengaturan**. Placeholder link untuk Rekap Penjualan/Pengeluaran
   **tidak** ditambahkan di stage ini (halamannya belum ada — nav-nya baru
   ditambah pas Stage 9 jalan), fokus stage ini cuma migrasi role +
   pemisahan grup "Ringkasan & Analitik" dari "Operasional".
5. Ganti flag boolean `adminOnly` di config nav jadi `minRole:
   "admin" | "super_admin"` (item tanpa `minRole` = semua role).
6. `settings/users` (Manajemen Pengguna): ubah dari admin-only jadi
   **super-admin-only** — perubahan kebijakan, bukan cuma label. SPV/captain
   (admin) tidak lagi bisa ubah role atau (non)aktifkan akun staff lain;
   itu jadi kewenangan owner saja.
7. Update seed/test user: akun existing (`staff@arraya.id` role `staff`,
   `admin@arraya.id` role `admin`) **tetap** di role masing-masing —
   `admin@arraya.id` representasi HRD/SPV/captain. Tambah **1 akun baru**
   `superadmin@arraya.id` role `super_admin` (representasi owner), supaya
   ketiga tier punya akun test terpisah untuk `permissions.spec.ts` (tidak
   menimpa satu-satunya akun `admin` yang sudah ada, yang justru dibutuhkan
   untuk mengetes batas akses tier `admin` vs `super_admin`).

**Tidak termasuk (di luar scope, jadi Stage 9):**

- Halaman/route baru `/app/sales`, `/app/expenses`.
- Perubahan isi Dashboard (`/app`) untuk menampilkan card finansial
  (omzet/pengeluaran/profit) dan filter periode — itu butuh tabel
  `sales_transactions`/`expense_items` dulu, jadi masuk Stage 9. Stage ini
  cuma menyiapkan *permission*-nya (staff boleh lihat data finansial),
  bukan *implementasi*-nya.
- POV Customer (public booking/registrasi event) — itu Stage 8, sudah ada
  plan terpisah di `docs/stage-8-commercial-expansion-plan.md`.
- Audit trail halaman terpisah (siapa mengubah apa) — kalau nanti Model A
  (staff edit semua entri) dianggap kurang akuntabel, itu perbaikan
  terpisah di atas kolom `created_by`/`updated_by` yang sudah ada di
  hampir semua tabel operasional.

## Permission Matrix (final, dikonfirmasi owner)

| Route | staff | admin | super_admin |
|---|:---:|:---:|:---:|
| `/app` (Dashboard) | ✅ | ✅ | ✅ |
| `/app/schedule` | ✅ | ✅ | ✅ |
| `/app/bookings` | ✅ | ✅ | ✅ |
| `/app/analytics` (booking) | ❌ | ✅ | ✅ |
| `/app/organizers` | ❌ | ✅ | ✅ |
| `/app/activities` | ❌ | ✅ | ✅ |
| `/app/areas` | ❌ | ✅ | ✅ |
| `/app/settings/business-hours` | ❌ | ✅ | ✅ |
| `/app/settings/users` | ❌ | ❌ | ✅ |

> Baris `/app/sales`, `/app/expenses` sengaja tidak dimasukkan di sini —
> permission-nya didefinisikan di plan Stage 9 supaya matrix ini tidak
> menjanjikan route yang belum ada.

## Perubahan nav (before → after)

**Before** (2 grup, dari Stage 5.1):
```
Operasional
  - Dashboard, Jadwal, Booking, Analytic (admin only)
Pengaturan (seluruh grup admin only)
  - Jam Operasional, Organizer & PIC, Jenis Kegiatan & Kategori, Area, Pengguna
```

**After** (3 grup):
```
Operasional                          [semua role]
  - Dashboard              /app
  - Jadwal                 /app/schedule
  - Booking                /app/bookings

Ringkasan & Analitik                 [admin, super_admin]
  - Analytic                /app/analytics

Pengaturan
  - Jam Operasional         /app/settings/business-hours   [admin, super_admin]
  - Organizer & PIC         /app/organizers                [admin, super_admin]
  - Jenis Kegiatan & Kategori  /app/activities             [admin, super_admin]
  - Area                    /app/areas                     [admin, super_admin]
  - Manajemen Pengguna      /app/settings/users            [super_admin] ← berubah dari admin-only
```

Mobile bottom-nav (Dashboard/Jadwal/Booking/Lainnya) tidak berubah, sama
seperti keputusan di Stage 5.1.

## File yang akan diubah/dibuat

- **Migrasi baru** `supabase/migrations/000X_rbac_super_admin.sql`:
  - `alter table profiles drop constraint ..._role_check`, tambah lagi
    dengan `check (role in ('admin', 'staff', 'super_admin'))`.
  - Redefine `is_admin()` → `role in ('admin', 'super_admin')`.
  - Tambah `is_super_admin()` → `role = 'super_admin'`.
  - Update policy `settings/users`-related (kalau ada policy khusus di
    tabel `profiles` untuk update role/is_active) supaya pakai
    `is_super_admin()`, bukan `is_admin()`.
- `src/lib/supabase/types.ts` — `ProfileRole` jadi
  `"super_admin" | "admin" | "staff"`.
- `src/lib/auth-context.tsx` — refactor total: buang `isAdmin: boolean`,
  ganti dengan object permission (`canManageMasterData`,
  `canManageUsers`, `canAccessAnalytics`, dst) yang dihitung dari role,
  mengikuti pola `getRolePermissions()` di lovinmilk.
- `src/lib/auth.ts` — pastikan `getCurrentUserProfile()` tidak perlu
  berubah (cuma baca `profile.role`, mapping permission-nya pindah ke
  `auth-context.tsx`).
- `src/lib/user-management.ts` — logic `role === "admin" && isActive`
  (baris 23) perlu direview: apakah dipakai untuk cek siapa yang boleh
  mengelola user (sekarang harus `super_admin`) atau untuk hal lain.
- `src/components/AppShell.tsx` — nav array jadi 3 grup + filter pakai
  `minRole` (bukan `adminOnly` boolean).
- `src/app/app/(app)/more/page.tsx` — sinkron dengan grup nav baru.
- `src/app/app/(app)/settings/users/*` — update guard route dari
  `role !== "admin"` jadi `role !== "super_admin"`.
- File yang **sudah pakai** `isAdmin` dari `useAuth()` dan perlu
  disesuaikan ke permission baru (cek ulang tiap pemakaian, jangan
  asal ganti nama variabel):
  `organizers-client.tsx`, `areas-client.tsx`, `activities-client.tsx`,
  `business-hours-client.tsx`.
- Seed/fixture test (`playwright` setup, kalau ada seed user admin) —
  tambah 1 user `super_admin` untuk test Manajemen Pengguna.

## Verifikasi

1. `bun run build` — lolos tanpa error type (perubahan `ProfileRole` bakal
   memicu banyak type error di tempat yang belum di-update — ini
   sengaja, jadi checklist file yang perlu disentuh).
2. `bun run test` — unit test lolos, termasuk test baru untuk
   `getRolePermissions()`/`canAccessAuthenticatedRoute()` kalau dibuat
   mengikuti pola `permissions.test.ts` lovinmilk.
3. `bun run test:e2e` — update `permissions.spec.ts` existing: tambah
   skenario `super_admin` (akses semua), `admin` (akses master data tapi
   BUKAN `/app/settings/users`), `staff` (akses operasional saja). Test
   lama yang mengasumsikan `admin` bisa buka Manajemen Pengguna perlu
   diperbaiki jadi negative test.
4. Verifikasi manual browser: login sebagai masing-masing 3 role, cek nav
   sidebar menampilkan grup yang sesuai; cek admin (SPV/captain) yang
   coba akses `/app/settings/users` langsung lewat URL ter-redirect (bukan
   cuma disembunyikan dari nav — regresi authorization seperti temuan
   audit lovinmilk soal Kontrol Data harus dihindari di sini).

## Risiko yang perlu diperhatikan

1. **Authorization gap saat migrasi** — kalau ada halaman yang guard-nya
   masih baca `role === "admin"` literal (bukan lewat helper), setelah
   migrasi role owner jadi `super_admin`, owner bisa ter-lockout dari
   halaman yang dia sendiri seharusnya bisa akses (karena `super_admin !==
   "admin"` secara string literal). **Wajib** grep semua `role ===
   "admin"` dan pastikan diganti ke helper/permission object yang paham
   hierarki, bukan perbandingan string langsung.
2. **Existing users** — user `admin` yang sudah ada di database saat ini
   perlu ditentukan dulu siapa yang naik ke `super_admin` sebelum migrasi
   dijalankan ke production (kalau tidak, tidak ada satu pun `super_admin`
   dan `settings/users` jadi tidak bisa diakses siapa pun).
3. **RLS policy yang lupa di-cover oleh `is_admin()`** — sudah dicek
   (grep `role = 'admin'` di seluruh `supabase/migrations/*.sql`):
   satu-satunya kemunculan ada di definisi `is_admin()` itu sendiri
   ([0001_init.sql:43](../supabase/migrations/0001_init.sql#L43)). Tidak
   ada policy lain yang bypass helper dengan menulis perbandingan role
   langsung, jadi redefine `is_admin()` cukup untuk menutup seluruh RLS
   policy yang ada saat ini. Tetap ulangi grep ini sesaat sebelum eksekusi
   migrasi (kalau ada migrasi baru masuk di antara plan ini ditulis dan
   dieksekusi).

## Status

Menunggu instruksi eksekusi eksplisit dari owner sebelum implementasi kode
dimulai, sesuai pola kerja stage-stage sebelumnya di proyek ini.
