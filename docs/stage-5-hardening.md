# Stage 5 — Operational Hardening

**Status:** Selesai (kode). Deployment & UAT perangkat nyata masih perlu dilakukan Admin.

## Perbaikan yang Dilakukan

1. **Timezone (kritikal)** — `src/lib/format.ts` menambahkan `localDateTimeToIso` (pakai `fromZonedTime(..., 'Asia/Jakarta')` dari `date-fns-tz`) dan `formatDateOnly`, menggantikan implementasi lokal yang bug (`new Date(...).toISOString()` bergantung timezone server/browser) di `schedule-client.tsx` dan `bookings-client.tsx`. Menyamakan format tampilan tanggal ke Asia/Jakarta secara konsisten.
2. **Dashboard** — `src/app/(app)/page.tsx` menampilkan data nyata sesuai PRD §7.2: jadwal hari ini, area digunakan/tersedia, booking hari ini, upcoming activities, quick action, alert konflik. Menggantikan placeholder "belum tersedia".
3. **Error handling** — pemetaan kode error Postgres diperluas (`23P01` bentrok jadwal, `23505` duplikat, `23514` melanggar constraint, `23503` referensi tidak valid) ke pesan Indonesia yang ramah, dengan fallback generik untuk kode lain. Ditambahkan error boundary `src/app/(app)/error.tsx` dan `src/app/error.tsx` dengan tombol coba lagi.
4. **RLS review** — policy di `0001_init.sql` diperiksa terhadap matriks role PRD §14: sudah benar membatasi tulis master data hanya untuk Admin. Tidak ada migration tambahan yang diperlukan.
5. **Concurrency** — ditinjau secara kode: RPC (`create_booking`, `cancel_booking`) bersifat transaksional, dan exclusion constraint di database adalah otoritas nyata anti-double-booking; pre-check di client hanya UX, tidak ada jalur yang melewati constraint.
6. **Mobile** — touch target navigasi di `AppShell.tsx` dinaikkan ke 44px; 4 dialog yang belum punya scroll ditambahkan `max-h-[90vh] overflow-y-auto`; tabel sudah punya wrapper scroll horizontal.
7. **Deployment prep** — `.env.example` diberi anotasi lengkap; README.md mendapat bagian "Deployment" (push ke GitHub, import ke Vercel, set env var, jalankan migration, buat admin pertama).

## Checklist Acceptance Criteria (PRD §20)

| Kriteria | Status |
|---|---|
| Admin dapat login | ✅ Kode selesai |
| Admin kelola Area/Activity/Organizer | ✅ Kode selesai |
| Business Hours berfungsi | ✅ Kode selesai |
| Staff dapat membuat schedule | ✅ Kode selesai |
| Sistem mencegah schedule bentrok | ✅ Kode selesai (DB exclusion constraint) |
| Availability terlihat per area & waktu | ✅ Kode selesai |
| Staff dapat membuat external booking | ✅ Kode selesai |
| Booking mengunci availability / cancel membuka kembali | ✅ Kode selesai |
| Calendar nyaman di HP | ✅ Kode selesai (review kode); ⚠️ UAT perangkat nyata belum dilakukan |
| Permission Admin/Staff berjalan | ✅ Kode selesai (RLS + UI) |
| RLS telah diuji | ⚠️ Ditinjau, belum diuji terhadap data live |
| Production build berhasil | ✅ `bun run build` lolos |
| Production deployment berhasil | ❌ Belum — perlu tindakan manual Admin |
| Critical UAT findings = 0 | ⚠️ Belum ada UAT nyata di device |

## Yang Masih Perlu Dilakukan Admin (Manual)

1. Jalankan migration `0001_init.sql` lalu `0002_booking_rpc.sql` di Supabase SQL Editor.
2. Sign up user pertama, lalu jalankan snippet SQL di README.md untuk set `profiles.role = 'admin'`.
3. Commit & push kode ke GitHub (`https://github.com/gapaicoding/arayya-space-keeper.git`), lalu import repo ke Vercel dan set 3 environment variable dari `.env.example`.
4. Uji coba manual di HP nyata (mobile UAT) sebelum go-live penuh.

Setelah keempat langkah di atas selesai, MVP dinyatakan **siap operasional** sesuai target roadmap PRD Stage 5.
