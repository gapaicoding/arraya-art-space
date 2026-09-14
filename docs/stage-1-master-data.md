# Stage 1 — Master Data

**Status:** Selesai (kode).

## Ringkasan

Implementasi CRUD untuk seluruh master data operasional sesuai PRD §7.3–7.6, dengan UI berbahasa Indonesia dan enforcement permission Admin/Staff di level UI (disembunyikan) dan RLS (nyata).

## Yang Dibangun

- **`/areas`** — CRUD Area/Room (nama, kode, deskripsi, capacity, lokasi, status aktif/nonaktif). Search & filter. Tombol tulis (create/edit/disable) hanya tampil untuk Admin.
- **`/activities`** — CRUD Activity (nama, kategori, deskripsi, durasi default, organizer terkait, rekomendasi kapasitas, status).
- **`/organizers`** — CRUD Organizer (internal/external, PIC, telepon, email, notes, status).
- **`/settings/business-hours`** — Editor jam operasional, 7 baris tetap (Senin–Minggu), per hari bisa set open/close time atau toggle tutup. Upsert berdasarkan `day_of_week`.
- Semua form pakai react-hook-form + zod, komponen shadcn Table/Dialog/Form.
- Data fetching melalui Supabase client dengan query yang mengikuti tipe skema Stage 0.

## Permission

Sesuai matriks role PRD §14: Admin full CRUD di seluruh master data; Staff hanya bisa membaca (tombol create/edit/disable disembunyikan di UI untuk role staff via `useAuth().isAdmin`, dan ditegakkan nyata lewat RLS policy admin-only write di `0001_init.sql`).

## Keterbatasan / Catatan

- Bergantung pada migration Stage 0 sudah diterapkan di database sebelum data bisa dibaca/ditulis.
