# Stage 9 — Retail & Financial Operations (MVP)

## Context

Owner minta Arraya dilengkapi kemampuan mencatat penjualan produk kerajinan
(paket melukis/menghias/meronce) dan pengeluaran restock bahan etalase,
mengikuti pola yang sudah terbukti jalan di lovinmilkweb (dashboard
operasional bisnis lain milik owner). Ini domain baru — bukan kelanjutan
scheduling/booking (Stage 0-8), sama seperti Kids Center (Stage 7) dulu
menambah domain baru di atas fondasi yang sama.

Data referensi diberikan owner dalam bentuk 1 file (`2026_MASTER_ARayya
Art & Creative Space`) berisi **komposisi/resep per paket** (nama paket,
bahan yang dipakai, quantity bahan, harga jual) — bukan daftar produk
flat. Setelah dianalisis, struktur ini persis pola BOM (Bill of Materials)
yang dipakai lovinmilk di modul Inventory mereka (Stage 4-5 lovinmilk:
`inventory_foundation`, `bom_active_master_hardening`,
`purchase_costing_sales_integration`).

**Keputusan scope (dikonfirmasi owner):** Stage 9 ini **MVP saja** — catat
penjualan & pengeluaran, tanpa BOM aktif (tidak ada pengurangan stok
otomatis, tidak ada kalkulasi HPP per paket). Data komposisi dari owner
tetap dipakai untuk mengisi nama produk, harga jual, dan katalog bahan
(§ Master data awal di bawah), tapi relasi resep (bahan apa untuk paket
apa, berapa qty) **tidak disimpan** di stage ini — ditunda ke Stage 10
kalau nanti dibutuhkan presisi stok/HPP otomatis. Alasan: staf perlu
terbiasa dulu dengan pencatatan dasar sebelum sistem menambah kerumitan
auto-deduct stok + stock opname yang menyertainya (lihat trade-off
lengkap di riwayat diskusi — BOM aktif itu 2 stage terpisah di lovinmilk
sendiri, bukan satu fitur kecil).

Modul Dashboard finansial **tidak** jadi route terpisah — digabung ke
`/app` (Dashboard existing) dengan filter periode, mengikuti pola
lovinmilk (`canAccessDashboard: true` untuk semua role, termasuk staff).
Ini keputusan yang sudah dikonfirmasi di Stage 5.3 (nav "Ringkasan &
Analitik" hanya untuk `/app/analytics` booking; dashboard finansial tetap
di `/app`).

## Scope

**Termasuk:**

1. Tabel master `products` (paket yang dijual) — diisi 16 baris dari data
   owner (lihat § Master data awal).
2. Tabel master `expense_items` (katalog bahan restock etalase) — diisi
   ~19 baris unik dari data owner.
3. Tabel transaksi `sales_transactions` — staff/admin/super_admin catat
   penjualan harian per produk (Model A: siapa saja bisa create+edit
   entri siapa saja, sesuai keputusan RBAC Stage 5.3).
4. Tabel transaksi `expense_transactions` — staff/admin/super_admin catat
   pengeluaran restock bahan.
5. Halaman `/app/sales` — form input + tabel rekap penjualan per item,
   filter tanggal, total harian.
6. Halaman `/app/expenses` — form input + tabel rekap pengeluaran, filter
   tanggal, total harian.
7. Perluas `/app` (Dashboard existing) — tambah filter periode (default:
   hari ini, bisa ganti ke rentang custom/bulan berjalan) + card omzet,
   total pengeluaran, estimasi profit kasar (omzet − pengeluaran, **bukan**
   HPP presisi karena tidak ada BOM), grafik tren sederhana.
8. Nav sidebar: tambah "Rekap Penjualan" & "Rekap Pengeluaran" ke grup
   Operasional (lihat Stage 5.3 nav final).
9. Master data `products`/`expense_items` masuk grup "Pengaturan" (admin+
   only untuk create/edit/archive, sama seperti Area/Aktivitas/Organizer).

**Tidak termasuk (di luar scope, jadi Stage 10):**

- BOM (`product_components`) — relasi resep produk → bahan.
- Auto-deduct stok bahan saat ada penjualan.
- Stock opname (rekonsiliasi stok fisik vs sistem).
- Kalkulasi HPP otomatis per paket.
- Data komposisi/resep dari file owner **disimpan mentah** di bagian
  bawah dokumen ini (§ Referensi BOM untuk Stage 10) supaya tidak hilang
  dan tidak perlu diminta ulang ke Mr Ryan nanti.

## Skema tabel

### `products`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text | mis. "Melukis Kanvas Polos" |
| category | text, nullable | "Melukis" \| "Menghias" \| "Meronce" — free text mengikuti pola `activities.category` yang sudah ada, bukan tabel relasi terpisah |
| price | numeric, not null | harga jual, harus > 0 (CHECK) |
| unit | text, nullable | default "paket" |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### `expense_items`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text | mis. "Cat 12 Warna" |
| category | text, nullable | mis. "Bahan Melukis" — free text |
| unit | text, nullable | "pcs" \| "set" \| "gulung" dll |
| default_price | numeric, nullable | harga acuan restock terakhir, opsional, bisa kosong dan diisi manual tiap transaksi |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### `sales_transactions`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| product_id | uuid, FK → products | not null |
| quantity | integer | harus > 0 (CHECK) |
| unit_price | numeric | **snapshot** harga jual saat transaksi dicatat (disalin dari `products.price` saat insert, tidak mengikuti perubahan harga produk di kemudian hari — supaya rekap historis tidak berubah retroaktif kalau harga produk direvisi) |
| total | numeric, generated | `quantity * unit_price` (generated column, tidak dihitung manual di aplikasi) |
| transaction_date | date | tanggal transaksi (bisa beda dari `created_at` kalau input telat) |
| notes | text, nullable | |
| deleted_at | timestamptz, nullable | soft delete/archive — `null` = aktif |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | siapa yang input/terakhir ubah — untuk audit trail, meski Model A tidak membatasi siapa boleh edit |

### `expense_transactions`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| expense_item_id | uuid, FK → expense_items | not null |
| quantity | integer | harus > 0 |
| unit_price | numeric | harga beli aktual saat itu (bisa beda dari `default_price` katalog — harga bahan naik turun) |
| total | numeric, generated | `quantity * unit_price` |
| transaction_date | date | |
| notes | text, nullable | |
| deleted_at | timestamptz, nullable | soft delete/archive |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

## RLS & Permission (mengacu matrix Stage 5.3)

- `products`, `expense_items`: `select` semua authenticated user (staff
  butuh baca buat dropdown form transaksi); `insert`/`update`/archive
  (`status = 'inactive'`) admin+ saja; hard delete super_admin saja —
  sama persis pola `areas`/`activities`/`organizers` yang sudah ada.
- `sales_transactions`, `expense_transactions`: `select`+`insert`+`update`
  semua authenticated user (Model A — staff boleh edit entri siapa saja);
  soft delete (`update deleted_at`) admin+ saja; hard delete (`delete`
  row) super_admin saja.
- Dashboard (`/app`) query agregat dari kedua tabel transaksi: semua role
  bisa `select` (staff ikut lihat omzet/profit, sesuai keputusan Stage
  5.3).

## Master data awal (dari file owner — untuk migrasi seed)

**`products`** (16 baris):

| name | category | price |
|---|---|---:|
| Melukis Kanvas Polos | Melukis | 29000 |
| Melukis Kanvas Angka | Melukis | 54000 |
| Melukis Kanvas Pola | Melukis | 34000 |
| Melukis Bucket-Hat | Melukis | 39000 |
| Melukis Tote-Bag | Melukis | 24000 |
| Melukis Pouch | Melukis | 24000 |
| Melukis Cermin | Melukis | 39000 |
| Melukis Beruang | Melukis | 34000 |
| Melukis Akrilik | Melukis | 34000 |
| Melukis Patung | Melukis | 19000 |
| Melukis Pot Tanah Liat | Melukis | 39000 |
| Melukis Pot Gypsum | Melukis | 39000 |
| Melukis Kipas Pola | Melukis | 19000 |
| Melukis Coaster | Melukis | 29000 |
| Menghias Cermin | Menghias | 29000 |
| Meronce Manik-manik | Meronce | 29000 |

**`expense_items`** (19 baris unik, diekstrak dari kolom "Jenis Produk" di
semua paket):

| name | unit |
|---|---|
| Kanvas 20x20 | pcs |
| Kanvas Angka | pcs |
| Kanvas Pola | pcs |
| Bucket-Hat | pcs |
| Tote Bag | pcs |
| Pouch | pcs |
| Cermin Hexagon | pcs |
| Ganci Beruang | pcs |
| Ganci Akrilik | pcs |
| Patung Gypsum | pcs |
| Pot Tanah Liat | pcs |
| Pot Gypsum | pcs |
| Kipas Pola | pcs |
| Coaster Gypsum | pcs |
| Cermin Kotak | pcs |
| Manik-manik | pcs |
| Cat 12 Warna | set |
| Kuas | pcs |
| Piring Palette | pcs |
| Benang | gulung |

> Catatan: "bahan utama" (Kanvas 20x20, Bucket-Hat, dst — 1 per paket)
> dan "bahan pakai bersama" (Cat 12 Warna, Kuas, Piring Palette, Benang —
> dipakai lintas banyak paket) sengaja **tidak dibedakan** secara struktur
> di stage ini — keduanya masuk `expense_items` sebagai baris sejajar,
> karena stage ini tidak melacak resep/BOM. Pembedaan itu baru relevan di
> Stage 10.

## File yang akan dibuat/diubah

- **Migrasi baru** `supabase/migrations/0007_retail_financial_mvp.sql`:
  tabel `products`, `expense_items`, `sales_transactions`,
  `expense_transactions` + RLS policy + seed data master di atas.
- `src/lib/supabase/types.ts` — tambah interface `Product`, `ExpenseItem`,
  `SalesTransaction`, `ExpenseTransaction`.
- `src/app/app/(app)/sales/page.tsx` + `sales-client.tsx` — halaman baru,
  pola sama seperti `bookings/page.tsx` (server fetch awal + client
  component untuk form & tabel).
- `src/app/app/(app)/expenses/page.tsx` + `expenses-client.tsx` — sama.
- `src/app/app/(app)/products/page.tsx` + `expense-items` master data
  page (di bawah grup Pengaturan) — CRUD sederhana, pola sama seperti
  `areas-client.tsx`/`activities-client.tsx` (isAdmin gate untuk
  create/edit/archive).
- `src/app/app/(app)/dashboard-client.tsx` — tambah filter periode + card
  omzet/pengeluaran/profit + fetch dari `sales_transactions` +
  `expense_transactions`.
- `src/components/AppShell.tsx` — tambah 2 item nav baru ("Rekap
  Penjualan", "Rekap Pengeluaran") ke grup Operasional, tambah "Produk" +
  "Katalog Bahan" ke grup Pengaturan.
- `src/lib/sales.ts`, `src/lib/expenses.ts` — fungsi murni untuk kalkulasi
  rekap (total per hari, per periode) yang bisa di-unit-test terpisah,
  mengikuti pola `src/lib/agenda.ts`/`analytics.ts`.
- `src/lib/sales.test.ts`, `src/lib/expenses.test.ts` — unit test untuk
  kalkulasi di atas (mengikuti standar lovinmilk: logic finansial wajib
  ada unit test, bukan cuma manual QA).

## Verifikasi

1. `bun run test` — unit test baru untuk `sales.ts`/`expenses.ts` lulus,
   ditambah semua test existing tetap lulus.
2. `bun run build` — lolos tanpa error tipe.
3. `bun run test:e2e` — spec baru: staff bisa input penjualan/pengeluaran
   tapi tidak bisa akses `/app/products` (master data); admin bisa akses
   `/app/products` dan archive entri; semua role (termasuk staff) bisa
   lihat card omzet/profit di `/app`.
4. Verifikasi manual: cross-check total di Dashboard dengan jumlah manual
   dari tabel Rekap Penjualan/Pengeluaran untuk periode yang sama (sanity
   check sebelum dianggap selesai, mengikuti pola verifikasi Stage 6.1).

## Risiko yang perlu diperhatikan

1. **`unit_price` snapshot vs harga produk berubah** — kalau ini tidak
   diimplementasikan sebagai snapshot (misal malah join live ke
   `products.price`), rekap historis akan berubah retroaktif setiap kali
   harga produk direvisi admin. Wajib snapshot saat insert.
2. **Free-text `category`** — sama seperti `activities.category` yang
   sudah ada, ini bukan tabel relasi, jadi rawan typo/inkonsistensi
   ("Melukis" vs "melukis" vs "Lukis"). Diterima sebagai trade-off sesuai
   pola existing di codebase ini (bukan regresi baru).
3. **Model A (staff edit semua entri)** — sudah dibahas & disetujui di
   Stage 5.3, risikonya (akuntabilitas) sudah dimitigasi dengan kolom
   `created_by`/`updated_by` di skema ini.

## Referensi BOM untuk Stage 10 (disimpan, tidak diimplementasi sekarang)

Komposisi bahan per paket, dari file owner (`2026_MASTER_ARayya Art &
Creative Space`), untuk dipakai langsung kalau Stage 10 (BOM aktif)
dieksekusi — supaya tidak perlu minta ulang ke Mr Ryan:

| Paket | Bahan (qty) |
|---|---|
| Melukis Kanvas Polos | Kanvas 20x20(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Kanvas Angka | Kanvas Angka(1), Piring Palette(1) |
| Melukis Kanvas Pola | Kanvas Pola(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Bucket-Hat | Bucket-Hat(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Tote-Bag | Tote Bag(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Pouch | Pouch(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Cermin | Cermin Hexagon(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Beruang | Ganci Beruang(1), Kuas(1), Piring Palette(1) |
| Melukis Akrilik | Ganci Akrilik(1), Kuas(1), Piring Palette(1) |
| Melukis Patung | Patung Gypsum(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Pot Tanah Liat | Pot Tanah Liat(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Pot Gypsum | Pot Gypsum(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Kipas Pola | Kipas Pola(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Melukis Coaster | Coaster Gypsum(1), Cat 12 Warna(2), Kuas(2), Piring Palette(1) |
| Menghias Cermin | Cermin Kotak(1) |
| Meronce Manik-manik | Manik-manik(1), Benang(2) |

## Status

Menunggu instruksi eksekusi eksplisit dari owner sebelum implementasi kode
dimulai, sesuai pola kerja stage-stage sebelumnya di proyek ini.
