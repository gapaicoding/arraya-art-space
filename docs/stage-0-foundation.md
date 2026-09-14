# Stage 0 — Foundation

**Status:** Selesai (kode). Migration database perlu dijalankan manual oleh Admin.

## Ringkasan

Proyek dimigrasikan dari scaffold Lovable (Vite + TanStack Start) ke **Next.js 14 (App Router, TypeScript, Tailwind CSS)** sesuai rekomendasi arsitektur di PRD §12. Komponen shadcn/ui yang sudah ada dipertahankan dan disesuaikan untuk App Router.

## Yang Dibangun

- Scaffold Next.js 14 App Router + TypeScript + Tailwind v4 (`next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`).
- ~35 komponen shadcn/ui di `src/components/ui/` diberi `"use client"` sesuai kebutuhan; komponen yang tidak dipakai (carousel, chart, drawer, input-otp, resizable) dihapus.
- Integrasi Supabase: `@supabase/supabase-js` + `@supabase/ssr`.
  - `src/lib/supabase/client.ts` — browser client.
  - `src/lib/supabase/server.ts` — server component/action client.
  - `src/lib/supabase/middleware.ts` — session refresh helper.
  - `src/middleware.ts` — melindungi semua route kecuali `/login`.
- `.env.local` (git-ignored, berisi kredensial asli) dan `.env.example` (masuk git, placeholder kosong).
- Skema database lengkap: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql):
  - Tabel: `profiles`, `areas`, `organizers`, `activities`, `business_hours`, `schedules`, `bookings`.
  - `EXCLUDE USING gist` (butuh extension `btree_gist`) pada `schedules` untuk (`area_id`, rentang waktu) — mencegah double booking di level database, mengabaikan baris `cancelled`.
  - Fungsi `is_admin()` untuk RLS berbasis role.
  - Trigger `handle_new_user` — user baru otomatis mendapat profil dengan role `staff`.
  - Trigger `updated_at` otomatis.
  - Sequence + trigger `booking_number` otomatis.
  - RLS aktif di semua tabel.
- Halaman `/login` (email + password via Supabase Auth, react-hook-form + zod).
- Logout via server action.
- `AppShell` — layout terautentikasi dengan sidebar (desktop) dan bottom navigation mobile: Dashboard / Jadwal / Booking / Lainnya.
- `src/lib/auth-context.tsx` — context React untuk role/nama user, di-set di `src/app/(app)/layout.tsx`.

## Yang Perlu Dilakukan Admin (Manual)

1. Jalankan [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) di Supabase Dashboard → SQL Editor (tidak bisa dijalankan otomatis hanya dengan URL + service role key — butuh akses DB langsung/personal access token yang tidak tersedia).

## Keterbatasan / Catatan

- Migration tidak diterapkan otomatis ke database live saat kode ini ditulis.
