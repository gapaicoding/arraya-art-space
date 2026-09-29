# Stage 8.1 — Registrasi Publik untuk Event

## Context

Permintaan awal owner soal "POV customer" ada 2 bagian: **lihat event**
(sudah selesai — Stage 5.2, halaman publik `/` menampilkan agenda minggu
ini + tombol WhatsApp) dan **registrasi** (belum ada). Stage ini menutup
bagian kedua.

Plan `docs/stage-8-commercial-expansion-plan.md` yang sudah ada
**sengaja tidak dipakai untuk kebutuhan ini** — dokumen itu mencakup
Payment/Invoice/Package dan eksplisit bergantung pada Stage 7 (Kids
Center) selesai dulu, jauh melebihi yang diminta owner sekarang
("registrasi aja", tanpa pembayaran). Stage 8.1 ini berdiri sendiri,
tidak bergantung Stage 7, dan **tidak menyentuh** payment/invoice sama
sekali — murni form pendaftaran minat.

**Keputusan desain kunci**: registrasi publik **tidak** langsung
membuat `bookings`. Tabel `bookings` & RPC `create_booking()` yang ada
didesain untuk staff yang login (`created_by` mengacu `auth.uid()`,
FK ke `profiles`) — pengunjung anonim tidak punya baris di `profiles`
sama sekali. Registrasi publik masuk ke tabel terpisah
(`event_registrations`) sebagai **lead/minat**, berstatus `pending`,
yang staff/admin review manual dan (kalau diterima) buat Booking asli
lewat alur internal yang sudah ada — bukan otomatis.

Alasan desain ini (bukan sekadar workaround teknis):
1. **Kontrol kapasitas tetap di tangan staff** — pendaftar publik bisa
   melebihi kapasitas riil (mis. kalau ada perubahan mendadak), staff
   perlu approve manual sebelum itu benar-benar mengikat slot.
2. **Anti-spam/abuse** — form publik tanpa autentikasi rawan disalahgunakan
   (bot, iseng). Registrasi ini secara desain tidak mengubah data
   operasional apa pun sampai staff review — jadi risiko spam paling
   buruk cuma "sampah" di tabel lead, bukan jadwal/booking asli yang
   rusak.

## Scope

**Termasuk:**

1. Tabel `event_registrations` — nama pendaftar, no. HP, jumlah peserta,
   catatan, `schedule_id` (event yang didaftar), status
   (`pending`/`confirmed`/`rejected`), timestamp.
2. Tombol "Daftar" di tiap baris event pada halaman publik `/` (yang
   sudah ada dari Stage 5.2) — buka form registrasi.
3. Form registrasi publik — nama, no. HP (wajib), jumlah peserta
   (wajib), catatan (opsional). Submit lewat Server Action (anon,
   tanpa login).
4. Proteksi dasar anti-spam: honeypot field tersembunyi (bot biasanya
   isi semua field termasuk yang disembunyikan CSS — kalau field ini
   terisi, submission ditolak diam-diam) + validasi server-side (no HP
   format Indonesia, panjang field wajar).
5. Halaman internal baru `/app/registrations` (admin+) — daftar
   pendaftaran masuk, filter status, tombol "Terima" (ubah status jadi
   `confirmed` — **tidak** otomatis bikin Booking, staff tetap harus
   bikin Booking manual lewat `/app/bookings` kalau mau ikat slot resmi)
   dan "Tolak" (`rejected`).
6. Nav: tambah "Pendaftaran" ke grup Operasional (admin+, karena ini
   perlu ditindaklanjuti staff — beda dari Rekap Penjualan/Pengeluaran
   yang boleh staff akses).

**Tidak termasuk (di luar scope):**

- Payment/invoice (itu Stage 8 yang lama, ditunda, bergantung Stage 7).
- Auto-convert registrasi jadi Booking — sengaja tetap manual (lihat
  alasan desain di atas).
- Notifikasi WA/email otomatis ke pendaftar (konfirmasi/reminder) — staff
  follow-up manual dulu lewat WhatsApp yang sudah ada di halaman publik.
- Akun/login untuk customer (portal pelanggan) — pendaftar tetap anonim,
  tidak ada akun yang dibuat.
- Filter kapasitas otomatis di form registrasi (menampilkan "sisa slot")
  — publik cuma lihat event, tidak lihat data kapasitas/booking existing
  (itu data internal).

## Skema tabel

### `event_registrations`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| schedule_id | uuid, FK → schedules | not null — event yang didaftar |
| customer_name | text, not null | |
| phone | text, not null | divalidasi format nomor Indonesia di server action |
| participant_count | integer, not null | harus > 0 |
| notes | text, nullable | |
| status | text | `pending` \| `confirmed` \| `rejected`, default `pending` |
| created_at | timestamptz | |
| reviewed_at | timestamptz, nullable | diisi saat status berubah dari `pending` |
| reviewed_by | uuid, FK → profiles, nullable | staff yang terima/tolak |

## RLS

- `insert`: role `anon` **dan** `authenticated` boleh insert (supaya form
  yang sama juga jalan kalau dibuka staff yang kebetulan login) — tapi
  **tanpa** bisa set `status`/`reviewed_at`/`reviewed_by` (kolom-kolom
  itu punya default aman, tidak diterima dari payload client via Server
  Action yang membatasi field yang di-passthrough).
- `select`: admin+ saja (halaman `/app/registrations`) — publik yang
  submit tidak bisa lihat balik data pendaftar lain.
- `update`: admin+ saja (ubah status).
- Tidak ada `delete` policy — kalau perlu dibersihkan, lewat Super Admin
  langsung di database, bukan fitur UI (data ini historis/low-risk, tidak
  perlu hard-delete flow selengkap `sales_transactions`).

## Perubahan halaman publik `/`

- Query existing (`src/app/page.tsx`) perlu tambah `id` ke `select`
  (sekarang cuma `date, start_at, end_at, activities(name), areas(name)`
  — perlu `schedules.id` supaya tombol "Daftar" tahu event mana yang
  dituju).
- Tiap baris event dapat tombol "Daftar" kecil di sisi kanan (sejajar
  `timeRange` yang sudah ada) — buka form (bisa inline expand atau
  halaman terpisah `/daftar/[scheduleId]`, diputuskan saat implementasi
  berdasarkan kompleksitas state management, defaultnya server action
  + progressive enhancement seperti pola booking internal yang sudah ada).

## File yang akan dibuat/diubah

- **Migrasi baru** `supabase/migrations/0010_event_registrations.sql` —
  tabel + RLS.
- `src/app/page.tsx` — tambah `id` ke query, tambah tombol "Daftar" per
  baris.
- `src/app/daftar/[scheduleId]/page.tsx` + form — halaman publik baru,
  di luar route group `(app)` sama seperti `/` (tidak pakai `AppShell`).
- `src/app/daftar/[scheduleId]/actions.ts` — Server Action `insert` ke
  `event_registrations`, validasi format HP + honeypot check.
- `src/app/app/(app)/registrations/page.tsx` + `registrations-client.tsx`
  — halaman internal review (admin+), pola sama seperti
  `organizers-client.tsx` (tabel + aksi Terima/Tolak, tanpa dialog
  create karena data masuk dari publik bukan diinput staff).
- `src/components/AppShell.tsx`, `more/page.tsx` — tambah nav
  "Pendaftaran" (`minRole: "admin"`).
- `src/lib/supabase/types.ts` — tambah interface `EventRegistration`.
- `src/lib/phone.ts` (baru) — fungsi murni `isValidIndonesianPhone()`,
  di-unit-test terpisah.

## Verifikasi

1. `bun run test` — unit test `phone.ts`.
2. `bun run build` — lolos tanpa error tipe.
3. `bun run test:e2e` — spec baru: anon (tanpa login) bisa buka `/`,
   klik "Daftar" di salah satu event, isi form, submit berhasil; admin
   login lihat pendaftaran baru muncul di `/app/registrations` dengan
   status `pending`; admin klik "Terima" → status berubah; staff (bukan
   admin) tidak bisa akses `/app/registrations`.
4. Verifikasi manual: submit form dengan nomor HP format salah → ditolak
   dengan pesan jelas; cek honeypot (isi field tersembunyi via devtools)
   → submission ditolak diam-diam (tidak ada error mencurigakan yang
   bocorin ke bot bahwa ada honeypot).

## Risiko yang perlu diperhatikan

1. **Spam/abuse tetap mungkin** — honeypot + validasi format cuma
   proteksi dasar, bukan rate-limiting penuh (butuh Vercel/Cloudflare
   level rate limit kalau abuse jadi masalah nyata di production; tidak
   dibangun sekarang karena over-engineering untuk kebutuhan saat ini).
2. **`schedule_id` bisa mengarah ke event yang sudah lewat/dibatalkan**
   — kalau pendaftar buka halaman lama (bookmark/share link) setelah
   event di-cancel, submission tetap masuk sebagai `pending` tapi staff
   akan lihat konteksnya sudah tidak relevan saat review manual. Tidak
   perlu validasi status schedule di server action (biarkan staff yang
   putuskan saat review — lebih simpel daripada re-validasi kompleks).
3. **Tidak ada dedup nomor HP** — pendaftar sama bisa submit berkali-kali
   untuk event yang sama. Diterima sebagai trade-off MVP; staff yang
   review manual akan lihat kalau ada duplikat.

## Status

**❌ Dibangun, lalu di-revert sepenuhnya.** Plan ini sempat diimplementasi
penuh (tabel `event_registrations`, form publik `/daftar/[scheduleId]`,
halaman review `/app/registrations`, migrasi `0010`/`0011`) dan
terverifikasi jalan (e2e 3/3 lolos). Owner kemudian memutuskan tombol
"Daftar" di halaman publik sebaiknya langsung mengarah ke WhatsApp CS
(dengan pesan yang sudah terisi info event) — bukan form registrasi
dengan alur review internal. Seluruh kode, tipe, nav, dan tabel database
sudah dihapus (migrasi `0012_drop_event_registrations.sql`).

Dokumen ini dibiarkan ada (bukan dihapus) sebagai riwayat keputusan —
kalau nanti kebutuhan alur registrasi-dengan-review muncul lagi, desain
di sini (termasuk alasan kenapa registrasi publik tidak boleh langsung
jadi `bookings`) masih valid untuk dipakai ulang.
