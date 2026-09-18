# Stage 5.1 — Restrukturisasi Menu (Operasional / Pengaturan)

## Context

Owner memberi masukan bahwa menu aplikasi sebaiknya dikelompokkan menjadi dua
kategori agar lebih jelas fungsinya bagi staff/admin sehari-hari:

- **Operasional** — hal yang dipakai staff setiap hari untuk menjalankan
  kegiatan: Dashboard, Jadwal, Booking, dan **Analytic** (baru, belum digarap —
  ditempatkan sebagai placeholder "Coming Soon" di stage ini).
- **Pengaturan** — hal yang jarang diubah, biasanya oleh admin: Jam
  Operasional & Jam Booking, Organizer & PIC, Jenis Kegiatan & Kategori, Area.

Saat ini menu masih flat (satu daftar 8 item tanpa pengelompokan) di
`src/components/AppShell.tsx` (sidebar desktop) dan
`src/app/(app)/more/page.tsx` (menu "Lainnya" di mobile). Stage ini murni
restrukturisasi navigasi + menambah 1 halaman placeholder Analytic — **tidak**
mengubah skema database, tidak mengubah kategori aktivitas menjadi relasi
(itu poin terpisah, di luar scope stage ini), dan tidak menambah data dummy
atau halaman publik (juga poin terpisah).

## Scope

**Termasuk:**
1. Kelompokkan sidebar desktop (`AppShell.tsx`) menjadi 2 section berlabel
   "Operasional" dan "Pengaturan", masing-masing dengan heading kecil.
2. Kelompokkan menu "Lainnya" (`more/page.tsx`) dengan pola yang sama, karena
   halaman ini sudah berfungsi sebagai overflow menu mobile untuk item yang
   tidak muncul di bottom nav.
3. Tambah halaman baru `/analytics` — route baru di bawah `(app)`, isi:
   pesan "Analytic — Coming Soon" (mengikuti pola visual glass-card yang
   sudah ada di halaman lain), + masuk ke grup "Operasional".
4. Rename label menu "Pengaturan" (yang sekarang mengarah langsung ke
   `/settings/business-hours`) menjadi heading grup, bukan link tunggal —
   karena setelah restrukturisasi, grup Pengaturan akan berisi 4-5 item
   (Jam Operasional, Organizer, Aktivitas/Kategori, Area, Pengguna),
   bukan 1 link.

**Tidak termasuk (di luar scope, akan jadi stage terpisah):**
- Isi nyata Analytic (metrik okupansi/aktivitas populer/booking trend —
  sudah dibahas di brainstorming, tapi butuh keputusan/plan sendiri).
- Kategori aktivitas sebagai tabel relasi terpisah (masih text bebas untuk
  sekarang; label menu berubah jadi "Jenis Kegiatan & Kategori" tapi
  mengarah ke halaman Aktivitas yang sudah ada, tanpa perubahan struktur
  data di stage ini).
- Business hours per-jam untuk booking (masih per-hari seperti sekarang).
- Data dummy harian dan halaman publik agenda.

## Perubahan menu (before → after)

**Before** (flat, `AppShell.tsx` nav array):
```
Dashboard, Jadwal, Booking, Area, Aktivitas, Organizer, Pengaturan, Pengguna
```

**After**:
```
Operasional
  - Dashboard        /            (semua role)
  - Jadwal           /schedule    (semua role)
  - Booking          /bookings    (semua role)
  - Analytic         /analytics   (admin only — Coming Soon)

Pengaturan (seluruh grup admin only)
  - Jam Operasional           /settings/business-hours
  - Organizer & PIC           /organizers
  - Jenis Kegiatan & Kategori /activities
  - Area                      /areas
  - Pengguna                  /settings/users
```

**Perubahan penting dari perilaku sekarang**: seluruh grup Pengaturan (Jam
Operasional, Organizer & PIC, Jenis Kegiatan & Kategori, Area) dan Analytic
menjadi **admin-only di level menu** — link-nya disembunyikan total dari
sidebar/menu staff. Ini beda dari perilaku saat ini, di mana staff masih
bisa membuka halaman Area/Aktivitas/Organizer (read-only, tanpa tombol
edit) untuk referensi. Setelah perubahan ini, staff tidak lagi melihat
menunya sama sekali — tapi staff **tetap bisa memilih Area/Aktivitas**
lewat dropdown saat membuat Jadwal/Booking (form terpisah, bukan lewat
halaman master data), karena dropdown itu query langsung ke tabel yang
RLS-nya tetap `select` untuk semua authenticated user (tidak diubah).
"Pengguna" tetap seperti sekarang (sudah admin-only), cuma dipindah masuk
ke grup Pengaturan secara visual.

Mobile bottom-nav (Dashboard/Jadwal/Booking/Lainnya) **tidak diubah** —
tetap 4 item flat seperti sekarang, karena bottom-nav secara desain tidak
menampung grouping. Analytic ditambahkan ke `more/page.tsx` di bawah section
"Operasional" agar tetap terjangkau di mobile.

## File yang akan diubah/dibuat

- `src/components/AppShell.tsx` — ubah `nav` array (const array of objects)
  menjadi array grup `{ heading: string, items: [...] }[]`, ubah render
  `.map()` di sidebar untuk menampilkan heading kecil per grup sebelum
  daftar link-nya. Filter `adminOnly` tetap berlaku per item seperti sekarang.
- `src/app/(app)/more/page.tsx` — ubah `links` array dengan pola grup yang
  sama (heading "Operasional" isinya cuma Analytic karena
  Dashboard/Jadwal/Booking sudah ada di bottom-nav; heading "Pengaturan"
  isinya 5 item di atas).
- `src/app/(app)/analytics/page.tsx` — halaman baru, server component
  sederhana yang render `AppShell` + card "Coming Soon", mengikuti pola
  halaman sederhana yang sudah ada (struktur mirip `more/page.tsx` atau
  halaman settings lain — pakai kelas `glass rounded-[22px]` yang sudah
  jadi pola visual standar di seluruh app).
- Tidak ada perubahan migrasi SQL, RLS, atau Server Action.

## Verifikasi

1. `bun run build` — pastikan lolos tanpa error type/lint.
2. `bun run test` — pastikan 52 unit test tetap lolos (tidak ada logic
   yang disentuh, cuma struktur navigasi & 1 halaman statis baru).
3. `bun run test:e2e` (chromium) — pastikan 15 e2e test existing tetap
   lolos, terutama yang menavigasi lewat sidebar/menu (`permissions.spec.ts`,
   `master-data.spec.ts`) karena mereka mengklik link berdasarkan nama —
   perlu dicek apakah ada test yang berasumsi struktur menu flat (misal
   `page.getByRole("link", { name: "Pengaturan" })` yang sekarang jadi
   heading, bukan link).
4. Verifikasi manual browser: cek sidebar desktop menampilkan 2 heading
   grup dengan urutan sesuai spek, cek menu "Lainnya" di viewport mobile,
   cek halaman `/analytics` menampilkan "Coming Soon" dan bisa diakses
   staff maupun admin (bukan admin-only), cek `/settings/users` tetap
   hilang dari tampilan kalau login sebagai staff.
5. Tidak ada data live yang tersentuh (murni UI), jadi tidak perlu proses
   cleanup data test seperti pada fitur-fitur sebelumnya.

## Keputusan visibilitas (dikonfirmasi owner)

- **Analytic**: admin-only — tidak terlihat oleh staff sama sekali, meski
  isinya cuma placeholder "Coming Soon".
- **Seluruh grup Pengaturan** (Jam Operasional, Organizer & PIC, Jenis
  Kegiatan & Kategori, Area, Pengguna): admin-only di menu — dianggap
  master data yang bukan urusan staff harian. Staff tetap bisa mengakses
  data Area/Aktivitas secara tidak langsung lewat dropdown di form
  Jadwal/Booking (tidak ada perubahan RLS/akses data, hanya visibilitas
  link menu).

## Status

Menunggu instruksi eksekusi eksplisit dari owner sebelum implementasi kode
dimulai, sesuai pola kerja stage-stage sebelumnya di proyek ini.
