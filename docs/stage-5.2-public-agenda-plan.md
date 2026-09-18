# Stage 5.2 — Halaman Publik Agenda Mingguan

## Context

Owner meminta domain utama Arayya bisa diakses publik (tanpa login) untuk
menampilkan agenda kegiatan minggu ini — tanggal, jam, dan nama kegiatan —
plus tombol "Hubungi Admin" yang langsung membuka WhatsApp. Tujuannya:
calon pengunjung/pelanggan bisa cek jadwal Arayya tanpa perlu akun, lalu
langsung chat admin kalau tertarik.

Keputusan yang sudah dikonfirmasi owner:
- **"/" (domain utama) menjadi halaman publik agenda.** Aplikasi internal
  (Dashboard, Jadwal, Booking, Master data, dst — yang selama ini di "/")
  **dipindah ke bawah path `/app`**. Ini breaking change untuk staff/admin:
  bookmark & kebiasaan mengetik domain polos perlu diarahkan ulang ke
  `/app` setelah stage ini live.
- Kontak admin memakai **nomor WhatsApp** (`wa.me` link), bukan telepon/email.

## Scope

**Termasuk:**
1. Pindahkan seluruh route aplikasi internal dari route group `(app)` yang
   sekarang match ke `/` → menjadi berbasis path `/app`.
2. Buat halaman publik baru di `/` — server component, tidak butuh login,
   menampilkan daftar kegiatan minggu ini (Senin–Minggu berjalan): tanggal,
   jam mulai, nama aktivitas, nama area. Mobile-friendly (ini yang paling
   sering dibuka dari HP calon pelanggan).
3. Tombol "Hubungi Admin" — link `https://wa.me/<nomor>` dibuka tab baru.
4. Middleware: tambah `/` ke daftar path publik (tidak wajib login), dan
   redirect root lama yang sebelumnya otomatis ke dashboard diarahkan ke
   `/app` setelah login.
5. RLS baru: policy `select` khusus role `anon` di tabel `schedules`,
   `activities`, `areas` — **dibatasi field yang aman** (tidak expose
   `bookings` sama sekali, karena berisi PII pelanggan — nama pemesan, no.
   HP, dsb). Publik hanya butuh join `schedules → activities.name` dan
   `schedules → areas.name`.

**Tidak termasuk (di luar scope):**
- Filter/pencarian agenda oleh publik, kalender bulan penuh, dsb — v1 cuma
  daftar flat minggu ini.
- Nomor WA dikelola lewat UI settings — untuk stage ini nomor WA disimpan
  sebagai env var (`PUBLIC_WHATSAPP_NUMBER`), bukan lewat database, karena
  jarang berubah dan menghindari perlu bikin tabel settings baru.

## Perubahan struktur route

**Before:**
```
src/app/
  (app)/            → match "/"   (Dashboard, Jadwal, Booking, dst — wajib login)
  login/            → match "/login"
```

**After:**
```
src/app/
  page.tsx          → match "/"      (BARU: halaman publik agenda, tanpa login)
  app/
    (app)/          → match "/app"   (aplikasi internal, isi & logic SAMA seperti
                                       sekarang, cuma pindah folder + prefix path)
      layout.tsx, page.tsx (dashboard), schedule/, bookings/, areas/,
      activities/, organizers/, analytics/, settings/, more/, actions.ts
  login/            → match "/login" (tidak berubah)
```

Cara pindah: folder `src/app/(app)/*` dipindah jadi `src/app/app/(app)/*`
(nested route group di bawah segment path `/app`). Semua isi/logic di
dalamnya (page.tsx, client component, actions.ts) **tidak berubah** — hanya
lokasi foldernya. Semua `redirect("/")` yang dipakai untuk "bukan admin,
lempar ke dashboard" di seluruh Server Action/page (misal
`settings/users/page.tsx`, `analytics/page.tsx`) perlu diubah menjadi
`redirect("/app")`.

`AppShell.tsx` — link `to: "/"` untuk item "Dashboard" berubah menjadi
`to: "/app"`. Link nav lain (`/schedule`, `/bookings`, dst) juga perlu
prefix `/app/...` di semua tempat yang mereferensikannya (`AppShell.tsx`,
`more/page.tsx`, `dashboard-client.tsx` kalau ada link internal, dan
`middleware.ts`'s post-login redirect target).

## Halaman publik `/`

- `src/app/page.tsx` — server component baru, **di luar** route group
  `(app)` (tidak pakai `AppShell`/sidebar sama sekali — layout sendiri,
  simpel, mobile-first).
- Query: `schedules` (join `activities.name`, `areas.name`) untuk rentang
  tanggal Senin–Minggu minggu berjalan (pakai `date-fns` `startOfWeek`/
  `endOfWeek`, timezone Asia/Jakarta seperti pola existing di
  `src/lib/format.ts`/`availability.ts`), filter `status != 'cancelled'`
  dan `type != 'blocked'` (blocked = internal housekeeping, tidak relevan
  buat publik).
- Tampilan: list dikelompokkan per tanggal, tiap baris menampilkan jam
  (format "09:00–11:00"), nama aktivitas, nama area. Kalau kosong minggu
  ini: tampilkan pesan "Belum ada agenda minggu ini".
- Tombol "Hubungi Admin" di bagian atas/bawah halaman: `<a href="https://wa.me/{NUMBER}" target="_blank">`.
  Nomor diambil dari `process.env.PUBLIC_WHATSAPP_NUMBER` (perlu
  ditambahkan ke `.env.local` dan Vercel env — **nomor aslinya perlu
  dikonfirmasi ke owner sebelum eksekusi**, ditulis format internasional
  tanpa "+", misal `6281234567890`).
- Logo Arayya ditampilkan di header halaman (reuse asset `/logo-arayya.jpg`
  yang sudah ada), supaya konsisten dengan branding app internal.

## Perubahan RLS (migrasi baru `0005_public_agenda.sql`)

```sql
create policy "schedules_select_anon" on public.schedules
  for select to anon using (status != 'cancelled' and type != 'blocked');

create policy "activities_select_anon" on public.activities
  for select to anon using (true);

create policy "areas_select_anon" on public.areas
  for select to anon using (true);
```
Tidak ada policy baru di `bookings` — anon tetap tidak bisa mengakses tabel
ini sama sekali (memang tidak dibutuhkan halaman publik).

## Middleware

`src/lib/supabase/middleware.ts` — tambah `/` (exact match, bukan
`startsWith` biar tidak ikut meng-cover `/app`) ke daftar publik, dan ubah
baris `if (user && path.startsWith("/login")) { url.pathname = "/" }`
menjadi `url.pathname = "/app"`. Tambah juga: kalau `!user` dan path diawali
`/app`, redirect ke `/login` (perilaku setara dengan sekarang, cuma target
prefix-nya berubah).

**Auto-redirect path lama** (agar bookmark/link lama staff tidak 404):
daftar prefix lama yang otomatis di-redirect (HTTP redirect, bukan
rewrite) ke versi barunya di bawah `/app`:
```
/schedule*     → /app/schedule*
/bookings*     → /app/bookings*
/areas*        → /app/areas*
/activities*   → /app/activities*
/organizers*   → /app/organizers*
/settings/*    → /app/settings/*
/more          → /app/more
/analytics     → /app/analytics
```
Diletakkan sebagai pengecekan di awal `updateSession()`, sebelum logic
auth-check yang sudah ada — supaya redirect ini jalan terlepas dari status
login (kalau belum login, redirect dulu ke `/app/schedule`, baru middleware
akan redirect lagi ke `/login` di request berikutnya — dua hop redirect,
tapi tidak masalah karena ini transisi sementara, bukan flow permanen).

## File yang akan diubah/dibuat

- **Pindah** (git mv, isi tidak berubah): `src/app/(app)/*` →
  `src/app/app/(app)/*`.
- **Ubah**: `src/lib/supabase/middleware.ts`, `src/components/AppShell.tsx`
  (semua path nav), `src/app/(app)/more/page.tsx` (ikut pindah + path),
  setiap `redirect("/")` di dalam route yang dipindah (grep untuk
  memastikan semua ditemukan, minimal ada di `settings/users/page.tsx`
  dan `analytics/page.tsx`), `src/app/login/*` (redirect setelah login
  sukses, kalau ada `router.push("/")` di client).
- **Baru**: `src/app/page.tsx` (halaman publik), kemungkinan
  `src/lib/agenda.ts` (fungsi query+format agenda minggu ini, supaya bisa
  di-unit-test terpisah dari komponen, mengikuti pola `src/lib/*.ts` yang
  sudah ada seperti `availability.ts`), `supabase/migrations/0005_public_agenda.sql`.
- **Update test**: seluruh e2e spec yang memakai `page.goto("/")` untuk
  masuk ke Dashboard (`helpers.ts`'s `login()` yang menunggu redirect ke
  `/`) perlu diubah ekspektasinya ke `/app`. Ini kemungkinan menyentuh
  banyak file (`helpers.ts`, hampir semua `*.spec.ts` yang login lalu
  mengecek URL) — perlu audit menyeluruh saat eksekusi.

## Verifikasi

1. `bun run build` — pastikan routing baru valid, tidak ada route yang
   bentrok (`/` publik vs `/app` internal harus resolve bersih).
2. `bun run test` — unit test lib agenda baru (kalkulasi rentang minggu,
   filter status/type) + pastikan test existing lain tidak rusak.
3. `bun run test:e2e` (chromium) — perbaiki semua spec yang terpengaruh
   perubahan path (`/` → `/app`), tambah spec baru untuk halaman publik:
   anon (tanpa login) bisa buka `/` dan melihat agenda, tombol WA punya
   href yang benar, dan **anon tidak bisa** akses `/app` (di-redirect ke
   `/login`).
4. Verifikasi manual browser: buka `/` di mode incognito (tanpa cookie
   login) — pastikan agenda muncul, coba klik tombol Hubungi Admin, lalu
   coba akses `/app` langsung tanpa login → harus dilempar ke `/login`.
   Login sebagai admin & staff → pastikan mendarat di `/app` (bukan `/`).
5. Cross-check RLS: pastikan request anon ke `bookings` tetap ditolak
   (403/empty), dan request anon ke `schedules` tidak mengembalikan baris
   `cancelled`/`blocked`.

## Keputusan (dikonfirmasi owner)

- **Nomor WhatsApp**: dummy dulu, `087654321` → ditulis di link sebagai
  format internasional tanpa "0" di depan dan tanpa "+": `6287654321`.
  **Catatan**: ini nomor dummy/placeholder, bukan nomor asli admin — perlu
  diganti ke nomor asli sebelum benar-benar go-live ke publik.
- **Redirect URL lama**: pakai auto-redirect (Opsi A). Middleware akan
  memetakan path lama tanpa prefix (`/schedule`, `/bookings`, `/areas`,
  `/activities`, `/organizers`, `/settings/*`) ke versi barunya di bawah
  `/app/...`, supaya bookmark/link lama staff tidak langsung 404 di hari
  pertama peluncuran.
