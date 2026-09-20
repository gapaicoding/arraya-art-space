# Stage 6.1 — Analytic: Ringkasan Periode & Tren Booking

## Context

Halaman `/app/analytics` saat ini masih placeholder "Coming Soon"
([src/app/app/(app)/analytics/page.tsx](../src/app/app/(app)/analytics/page.tsx)).
Ini bagian dari **Stage 6 — Reporting** di [PRD.md](PRD.md#L835-L840)
(Occupancy, Activity frequency, Booking metrics, Utilization), yang sampai
sekarang belum digarap.

Dari diskusi dengan owner, halaman Analytic perlu **self-contained**: admin
dengan role yang cuma diberi akses ke menu Analytic (tidak ke Jadwal atau
Booking) harus bisa mendapat gambaran lengkap tanpa pindah halaman. Karena
itu semua metrik di stage ini menarik & menggabungkan data langsung dari
`bookings` + `schedules` di server, bukan sekadar link ke modul lain.

Dari beberapa metrik yang dipertimbangkan (ringkasan, okupansi per area, tren
booking, aktivitas terpopuler), **stage ini fokus ke dua yang paling sering
dicek duluan**: ringkasan periode, dan tren booking dari waktu ke waktu.
Okupansi per area dan aktivitas terpopuler didorong ke stage 6.2 lanjutan.

## Scope

**Termasuk:**
1. **Metrik #1 — Ringkasan Periode**: kartu angka untuk rentang tanggal
   terpilih — total booking per status (pending/confirmed/cancelled/
   completed), dan okupansi area (% jam terpakai vs jam operasional).
2. **Metrik #3 — Tren Booking**: grafik jumlah booking per hari dalam
   rentang tanggal terpilih.
3. Filter di atas halaman: rentang tanggal (default: bulan berjalan) dan
   area (default: semua area) — konsisten dengan pola filter di modul lain
   (mis. tanggal mulai/akhir + select area).
4. Akses: tetap admin-only, mengikuti guard yang sudah ada di
   `analytics/page.tsx` (role `!== "admin"` → redirect).

**Tidak termasuk (di luar scope, jadi stage 6.2+):**
- Okupansi per area (ranking area terlaris) dan aktivitas terpopuler.
- Export/print laporan (PDF/Excel).
- Perbandingan periode (mis. "vs bulan lalu").
- Analytic untuk role selain admin (mis. role terbatas "Analytic only" —
  itu perubahan RLS/permission terpisah, belum dikonfirmasi owner).

## Sumber data

Query dari tabel yang sudah ada, tidak perlu tabel/migrasi baru:

- **`bookings`**: `status`, `schedule_id`, `created_at`.
- **`schedules`**: `date`, `start_at`, `end_at`, `area_id`, `status`, `type`.
  Join `bookings.schedule_id → schedules.id` untuk filter by tanggal & area
  (tanggal booking = tanggal schedule terkait, bukan `bookings.created_at`,
  supaya konsisten dengan cara staff berpikir "booking tanggal berapa").
- **`business_hours`**: `day_of_week`, `is_closed`, `open_time`, `close_time`
  — untuk hitung total jam operasional per hari dalam rentang, sebagai
  denominator okupansi.
- **`areas`**: untuk populate opsi filter area (`id`, `name`, `status =
  'active'`).

## Query & kalkulasi

### Ringkasan (Metrik #1)

```sql
select s.date, b.status
from bookings b
join schedules s on s.id = b.schedule_id
where s.date between :start and :end
  and (:area_id is null or s.area_id = :area_id)
```
- Group by `status` di server (JS), hasilkan 4 angka: pending, confirmed,
  cancelled, completed.
- **Okupansi**: total durasi jam schedule berstatus bukan `cancelled` yang
  jatuh di rentang tanggal (dari `schedules` langsung, tidak perlu join
  `bookings` — schedule `internal_activity`/`blocked` juga menghabiskan slot,
  jadi ikut dihitung sebagai "terpakai") dibagi total jam operasional
  (dari `business_hours`, dikali jumlah hari non-`is_closed` dalam rentang,
  dikurangi hari yang sudah lewat 0 jam kalau `is_closed`). Ditampilkan
  sebagai persentase.

### Tren (Metrik #3)

```sql
select s.date, count(*) as booking_count
from bookings b
join schedules s on s.id = b.schedule_id
where s.date between :start and :end
  and b.status != 'cancelled'
  and (:area_id is null or s.area_id = :area_id)
group by s.date
order by s.date
```
- Hari tanpa booking tetap muncul di grafik dengan nilai 0 (isi gap tanggal
  di JS, bukan di SQL, mengikuti pola `groupAgendaByDate` di
  [src/lib/agenda.ts](../src/lib/agenda.ts)).
- Kalau rentang lebih dari ~60 hari, agregasi otomatis per minggu bukan per
  hari (supaya grafik tidak terlalu padat) — threshold pasti ditentukan saat
  implementasi berdasarkan hasil uji coba visual.

## Lib baru

`src/lib/analytics.ts` (mengikuti pola `agenda.ts`: fungsi murni yang bisa
di-unit-test terpisah dari komponen):
- `summarizeBookingStatus(rows)` → hitung total per status.
- `calculateOccupancyRate(scheduleDurations, businessHours, dateRange)` →
  persentase okupansi.
- `buildBookingTrend(rows, dateRange)` → array `{ date, count }` dengan gap
  tanggal terisi 0, plus logic agregasi mingguan kalau rentang panjang.

Ditambah `src/lib/analytics.test.ts` untuk ketiga fungsi ini (kasus: rentang
kosong, semua status sama, gap tanggal, hari `is_closed`).

## Halaman & komponen

- `src/app/app/(app)/analytics/page.tsx` — server component, fetch data
  awal (rentang default: 1–akhir bulan berjalan, semua area), lempar ke
  client component. Guard admin-only tetap seperti sekarang.
- `src/app/app/(app)/analytics/analytics-client.tsx` — client component:
  - Filter bar: date range picker (mulai/akhir) + select area, re-fetch
    lewat Server Action saat filter berubah (pola sama seperti filter di
    modul Booking List — lihat §10.6 di [PRD.md](PRD.md#L480)).
  - 4 kartu ringkasan status booking + 1 kartu okupansi (total 5 kartu,
    grid responsive).
  - Grafik tren booking — pakai `dataviz` skill untuk styling chart supaya
    konsisten dengan palet warna dark theme yang sudah dipakai app ini.
- `src/app/app/(app)/analytics/actions.ts` — Server Action
  `getAnalyticsSummary(filters)` yang menjalankan query & lib di atas,
  dipanggil ulang saat filter berubah (tanpa reload halaman).

## File yang akan diubah/dibuat

- **Baru**: `src/lib/analytics.ts`, `src/lib/analytics.test.ts`,
  `src/app/app/(app)/analytics/analytics-client.tsx`,
  `src/app/app/(app)/analytics/actions.ts`.
- **Ubah**: `src/app/app/(app)/analytics/page.tsx` (ganti placeholder
  "Coming Soon" jadi render `AnalyticsClient` dengan data awal).

Tidak ada migrasi database baru — semua kolom yang dibutuhkan sudah ada.

## Verifikasi

1. `bun run test` — unit test `analytics.test.ts` lulus (termasuk edge case
   rentang tanpa booking, hari libur `is_closed`, area filter kosong vs
   terisi).
2. `bun run build` — pastikan tidak ada type error di server action/client.
3. `bun run test:e2e` (chromium) — spec baru: admin login → buka
   `/app/analytics` → ubah filter tanggal & area → kartu ringkasan dan
   grafik ter-update sesuai data seed. Non-admin (staff) tetap di-redirect
   dari `/app/analytics`.
4. Verifikasi manual browser: cek tampilan mobile (card grid tidak pecah),
   cek angka ringkasan cocok dengan data booking yang ada di halaman Booking
   List untuk rentang tanggal yang sama (cross-check manual sekali sebagai
   sanity check sebelum dianggap selesai).

## Keputusan (dikonfirmasi)

- **Default rentang tanggal**: bulan berjalan (mis. tanggal 20 September →
  default tampil 1–30 September).
- **Okupansi**: dihitung dari semua `type` di `schedules` yang bukan
  `cancelled` (termasuk `blocked`) — karena `blocked` juga berarti area
  tidak tersedia untuk booking lain, jadi ikut dihitung sebagai "terpakai".
