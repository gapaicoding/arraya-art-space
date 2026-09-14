# Stage 2–4 — Scheduling Engine, Availability, Booking

**Status:** Selesai (kode). Migration RPC tambahan perlu dijalankan manual.

## Stage 2 — Scheduling Engine (PRD §7.7, 7.8, 8.1, 8.2, 9.1)

- **`/schedule`** — tab "Daftar Jadwal": pilih tanggal, buat/edit/batalkan schedule (area, tipe internal_activity/external_booking/blocked, activity, organizer, jam mulai/selesai, kapasitas, notes).
- Validasi:
  - `end_time > start_time` (zod, client-side).
  - Terhadap Business Hours: hari tidak boleh `is_closed`, jam harus dalam rentang open/close hari itu.
  - Area harus aktif.
  - Pre-check bentrok di client (UX cepat), tapi otoritas nyata tetap **exclusion constraint** di database (`0001_init.sql`). Error Postgres `23P01`/`23505` dipetakan ke pesan: *"Jadwal bertabrakan dengan jadwal lain di area ini."*
- Membatalkan schedule → `status='cancelled'`, membuka kembali availability (sesuai PRD 7.7).
- Time slot (PRD §7.8): tidak ada tabel `time_slots` — slot 1 jam hanya representasi tampilan (`buildHourSlots` di `src/lib/availability.ts`), data asli tetap `start_at`/`end_at`.

## Stage 3 — Availability (PRD §7.9, 9.3)

- `src/lib/availability.ts` — engine yang menggabungkan Business Hours + status Area + Schedule non-cancelled menjadi grid per-jam dengan status: `AVAILABLE`, `INTERNAL_ACTIVITY`, `BOOKED`, `BLOCKED`, `CLOSED` (persis enum PRD §7.9).
- Tab "Availability" di `/schedule`: grid per-area, per-jam, dengan badge berwarna. Toggle Today/Day/Week (Week disederhanakan demi mobile usability).

## Stage 4 — Booking (PRD §7.10, 9.2)

- **`/bookings`** — list booking dengan filter status (PENDING/CONFIRMED/CANCELLED/COMPLETED) dan pencarian.
- Migration baru: [`supabase/migrations/0002_booking_rpc.sql`](../supabase/migrations/0002_booking_rpc.sql) — dua fungsi Postgres transaksional:
  - `create_booking(...)` — insert `schedules` (type `external_booking`) + `bookings` (status `pending`) sekaligus, validasi area aktif dan `participant_count <= capacity`, otomatis terlindungi exclusion constraint. Dipanggil via `supabase.rpc("create_booking", ...)`.
  - `cancel_booking(booking_id)` — membatalkan booking dan schedule terkait sekaligus, membuka availability.
- Dialog detail booking: lihat info lengkap, ubah status (Konfirmasi/Selesaikan via update biasa; Batalkan via RPC).
- Kapasitas: validasi `participant_count` tidak melebihi kapasitas area, dilakukan di RPC (raise exception) dan ditampilkan sebagai pesan ramah di client.

## Yang Perlu Dilakukan Admin (Manual)

1. Jalankan [`supabase/migrations/0002_booking_rpc.sql`](../supabase/migrations/0002_booking_rpc.sql) di SQL Editor **setelah** `0001_init.sql`.

## Keterbatasan / Catatan

- Belum ada pengujian concurrency nyata terhadap database live (lihat Stage 5).
- Timezone: ada isu pada versi awal (`new Date("YYYY-MM-DDTHH:mm")` bergantung timezone browser/server) — **diperbaiki di Stage 5**.
