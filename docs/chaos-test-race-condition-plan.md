# Chaos Testing — Race Condition pada Booking/Jadwal

## Context

Invarian paling kritis di aplikasi ini adalah **tidak boleh ada 2 jadwal aktif
yang bertumpuk di Area & jam yang sama** — dijaga oleh PostgreSQL exclusion
constraint (`exclude using gist (area_id with =, tstzrange(...) with &&)`) di
`schedules`, dan RPC `create_booking` yang membungkusnya. Sejauh ini constraint
ini sudah diuji lewat e2e Playwright (`scheduling.spec.ts`, `booking.spec.ts`),
tapi selalu **berurutan** (request A selesai baru request B jalan) — belum
pernah diuji dengan request yang benar-benar **bersamaan** (concurrent),
skenario yang jauh lebih realistis untuk kondisi race sungguhan (misal 2 staff
klik "Buat Jadwal" di jam yang sama persis).

Tujuan chaos test ini: kirim banyak request pembuatan jadwal/booking yang
overlap secara **paralel sungguhan** (bukan simulasi berurutan) langsung ke
Supabase (via RPC `create_booking` dan insert langsung ke `schedules`), lalu
verifikasi:
1. Exclusion constraint tetap menolak semua percobaan yang bertumpuk kecuali
   tepat satu yang berhasil — tidak ada dua baris aktif yang overlap lolos.
2. Tidak ada data korup/setengah jadi (mis. booking tanpa schedule, atau
   booking_number duplikat) akibat race pada trigger `set_booking_number`.
3. Error yang dikembalikan Postgres saat constraint ditabrak wajar (23P01 /
   exclusion violation), bukan crash/500 aneh.

## Scope & Keamanan Data

- Test dijalankan langsung ke **live production Supabase** (satu-satunya DB
  yang ada) — sama seperti seluruh verifikasi di sesi ini sebelumnya.
- Semua baris `schedules`/`bookings` yang dibuat akan diberi `notes` dengan
  prefix jelas (`CHAOS_TEST_`) supaya mudah diidentifikasi dan **dihapus
  total** di akhir pengujian, tidak peduli hasilnya sukses/gagal.
- Area yang dipakai: `Room 1` (satu-satunya area aktif), pada tanggal jauh di
  masa depan (`2027-01-01`) supaya tidak bersinggungan dengan data asli
  apa pun (dummy maupun pekerjaan staff sungguhan).
- Tidak menyentuh UI/browser sama sekali — murni request paralel ke REST API
  Supabase (pakai service-role key, meniru semua role authenticated karena
  RLS untuk insert schedules/bookings hanya mensyaratkan `authenticated`,
  bukan identitas tertentu).

## Skenario Uji

**Skenario 1 — 10 insert `schedules` paralel, jam identik, Area sama**
Kirim 10 request `POST /rest/v1/schedules` secara BERSAMAAN (Promise.all,
bukan sequential) dengan `area_id`, `date`, `start_at`, `end_at` yang
**identik persis** (10:00–11:00, 2027-01-01, Room 1). Ekspektasi: tepat 1
berhasil (201), 9 gagal dengan error exclusion constraint (23P01).

**Skenario 2 — 10 insert paralel dengan jam yang saling overlap sebagian**
10 request dengan jam yang digeser 10 menit satu sama lain (10:00-11:00,
10:10-11:10, 10:20-11:20, dst) — beririsan berantai. Ekspektasi: exclusion
constraint tetap konsisten — tidak ada 2 baris yang lolos dan salingtumpang
tindih satu sama lain (perlu diverifikasi manual post-hoc dengan mengecek
semua kombinasi pasangan yang berhasil).

**Skenario 3 — RPC `create_booking` dipanggil paralel untuk slot yang sama**
Kalau `create_booking` RPC menerima parameter jadwal+booking sekaligus
(insert schedule DAN booking dalam satu transaksi), tembak RPC ini 10x
paralel dengan payload identik. Ekspektasi sama seperti Skenario 1, PLUS
pastikan tidak ada baris `bookings` yatim (booking tanpa schedule valid) yang
tertinggal dari percobaan yang gagal di tengah jalan.

## Verifikasi

1. Setelah tiap skenario: query `schedules` & `bookings` yang match
   `notes ILIKE 'CHAOS_TEST_%'`, hitung jumlah baris yang benar-benar
   tersimpan, cek tidak ada overlap di antara yang tersisa.
2. Cek `bookings` tidak ada baris dengan `schedule_id` yang tidak match ke
   `schedules` manapun (orphan).
3. Cek `booking_number` (dari trigger `set_booking_number`) tidak ada duplikat
   di antara baris yang berhasil.
4. **Cleanup wajib**: hapus SEMUA baris `CHAOS_TEST_*` di `bookings` lalu
   `schedules` (urutan FK) di akhir, verifikasi count kembali ke kondisi awal
   sebelum test dimulai.

## Hasil Eksekusi

Dijalankan langsung ke production Supabase (10 request paralel sungguhan per
skenario, via `Promise.all`, bukan sequential), Area "Room 1", tanggal
2027-01-01. Semua data ditandai `CHAOS_TEST_*` dan sudah dihapus total
setelah verifikasi (`schedules`/`bookings` dengan prefix itu = 0 baris,
dikonfirmasi ulang).

**Skenario 1 — 10 insert identik paralel**: tepat **1 berhasil, 9 gagal** ✅.
Menariknya, 9 kegagalan itu bukan error exclusion-constraint (`23P01`) yang
bersih, melainkan **`57014` (statement timeout)** — di bawah kontensi lock
yang sangat tinggi (10 insert identik bersamaan), Postgres men-timeout
sebagian request yang menunggu, alih-alih langsung menolak dengan pesan
constraint violation. **Invarian data tetap terjaga** (tidak ada yang lolos
dobel), tapi ini artinya kalau race sungguhan terjadi di dunia nyata, pesan
error mentah yang diterima klien bisa berbeda-beda (kadang `23P01`, kadang
`57014`) tergantung seberapa parah kontensinya.

**Skenario 2 — 10 insert staggered (geser 10 menit) paralel**: **2 berhasil,
8 gagal**, dan hasil akhirnya sudah benar secara matematis — dengan durasi
60 menit & pergeseran 10 menit, maksimum slot yang bisa non-overlap dari
10 percobaan itu memang cuma 2. Dicek manual: **tidak ada satupun pasangan
baris yang lolos saling bertumpuk** ✅.

**Skenario 3 — RPC `create_booking` 10x paralel, slot identik**: tepat
**1 berhasil, 9 gagal**, dan kali ini SEMUA kegagalan mengembalikan
`23P01` yang bersih (bukan timeout) — RPC yang membungkus insert
schedule+booking dalam 1 transaksi ternyata **lebih tahan** terhadap
race dibanding insert langsung ke tabel `schedules`. Tidak ada booking
yatim (booking tanpa schedule valid), dan `booking_number` tidak ada
duplikat.

**Cek aplikasi**: `schedule-client.tsx` (`mapScheduleError`) dan
`bookings-client.tsx` (`mapBookingError`) sudah menangani `23P01`/`23505`
dengan pesan "Jadwal bertabrakan..." — tapi kode `57014` (timeout) yang
muncul di Skenario 1 **tidak ada penanganan khusus**, jatuh ke pesan
fallback generik ("Gagal menyimpan jadwal. Silakan coba lagi..."). Ini
**bukan bug kritis** (fallback-nya tetap sopan, berbahasa Indonesia, tidak
menampilkan stack trace mentah) tapi secara UX kurang informatif — user
tidak akan tahu itu sebenarnya soal "jadwal bentrok", cuma disuruh
"coba lagi", padahal mengulang di jam yang sama akan tetap gagal.

## Kesimpulan & Rekomendasi

- **Invarian anti-double-booking terbukti kokoh** terhadap race condition
  sungguhan (paralel asli, bukan simulasi berurutan) di ketiga skenario —
  tidak ada satu pun kasus 2 jadwal aktif yang tumpang tindih lolos ke DB.
- **Temuan minor**: tambahkan `57014` ke daftar kode error yang dipetakan
  ke pesan "Jadwal bertabrakan..." di `mapScheduleError`/`mapBookingError`
  (statement timeout di bawah lock contention pada constraint yang sama
  cukup sering berarti "ada request lain yang barusan menang slot ini").
  Ini perbaikan kecil, opsional — beri tahu kalau mau saya eksekusi.
- Tidak ditemukan data korup, insert setengah jadi, atau booking_number
  duplikat di skenario mana pun.

## Yang TIDAK dilakukan di sesi ini

- Tidak melakukan load testing skala besar (ratusan/ribuan request) — cukup
  10 paralel per skenario untuk membuktikan race window bisa ditembus atau
  tidak, tanpa membebani project Supabase (tier gratis/kecil).
- Tidak chaos-test fuzz input form atau simulasi network failure (sudah
  ditanyakan ke Anda, fokus disepakati hanya race condition booking).
