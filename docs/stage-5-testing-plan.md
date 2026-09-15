# Stage 5.x — Testing Plan (Unit sampai E2E)

**Status:** Sedang berjalan (bagian dari Stage 5 — Operational Hardening).

Bagian ini memecah pengujian di Stage 5 menjadi sub-stage berurutan, dari unit test (logic murni, cepat, offline) sampai end-to-end test (browser asli, terhadap database Supabase live), sebelum MVP dinyatakan "siap operasional" sesuai PRD §20.

## 5.1 — Unit Testing (Vitest)

> **Hasil:** ✅ Lulus — 23/23 test passing (`src/lib/availability.test.ts`: 15 test, `src/lib/format.test.ts`: 8 test termasuk kasus batas 00:30 Jakarta). Dijalankan via `bun run test`.

**Tujuan:** memverifikasi business logic murni tanpa dependency eksternal (tidak ada network/DB call), jalan cepat dan bisa di-run kapan saja.

**Cakupan:**
- `src/lib/availability.ts` (Availability Engine, PRD §7.9):
  - Hari tutup di Business Hours → seluruh slot `CLOSED`.
  - Area `inactive` → seluruh slot tidak tersedia.
  - Schedule `internal_activity` mengisi sebagian jam → slot lain tetap `AVAILABLE`, slot terisi jadi `INTERNAL_ACTIVITY`.
  - Schedule `external_booking` → `BOOKED`.
  - Schedule `blocked` → `BLOCKED`.
  - Schedule dengan status `cancelled` → tidak mengunci slot (tetap `AVAILABLE`), sesuai PRD §7.7.
  - Kondisi batas: schedule mulai persis di jam buka / selesai persis di jam tutup.
- `src/lib/format.ts` (konversi timezone Asia/Jakarta):
  - Waktu lokal Jakarta → ISO UTC yang benar, dan sebaliknya.
  - Kasus batas (misal 00:30 waktu Jakarta) yang berisiko salah tanggal kalau timezone tidak ditangani benar.

**Tooling:** Vitest, dijalankan lewat `bun run test`. Tidak menyentuh Supabase sama sekali.

## 5.2 — End-to-End Testing Setup (Playwright)

**Tujuan:** menyiapkan infrastruktur e2e yang aman dijalankan terhadap database Supabase live tanpa merusak data asli.

**Langkah:**
- Install `@playwright/test`, konfigurasi `playwright.config.ts` (baseURL `http://localhost:3000`, auto-start `bun run dev` via `webServer`).
- Buat 2 user test khusus lewat Supabase Admin API (service role key): `e2e-test-admin@arayya.test` (role admin) dan `e2e-test-staff@arayya.test` (role staff) — dibuat di awal run (global setup), dihapus total di akhir run (global teardown), termasuk profile-nya.
- Semua data yang dibuat test (Area/Activity/Organizer/Schedule/Booking) diberi prefix `E2E_TEST_` supaya mudah dibedakan dari data asli dan mudah dibersihkan.
- **Batasan keras:** tidak boleh menyentuh user admin asli yang sudah ada, atau data apapun yang tidak berprefix `E2E_TEST_`.

## 5.3 — E2E: Auth & Permission (PRD §14)

- Login salah password → pesan error Bahasa Indonesia tampil, tidak masuk.
- Login admin benar → masuk ke dashboard, app shell dengan bottom nav (Dashboard/Jadwal/Booking/Lainnya) tampil.
- Role Admin: tombol create/edit tampil di halaman Area/Activity/Organizer.
- Role Staff: tombol create/edit **tersembunyi** di halaman Area/Activity/Organizer (read-only), tapi tetap bisa membuat Schedule dan Booking.

## 5.4 — E2E: Master Data CRUD (Stage 1)

- Admin membuat Area baru (`E2E_TEST_Area_1`) → muncul di list → diedit → reload halaman → perubahan tersimpan.
- Pengujian ringan serupa untuk 1 Activity dan 1 Organizer ber-prefix `E2E_TEST_`.
- Halaman Business Hours menampilkan 7 baris hari (Senin–Minggu).

## 5.5 — E2E: Scheduling & Anti-Double-Booking (Stage 2, PRD §8.1)

- Buat schedule pada area `E2E_TEST_` di jam operasional yang valid.
- Coba buat schedule kedua yang jamnya bertabrakan di area & waktu yang sama → harus ditolak dengan pesan *"Jadwal bertabrakan dengan jadwal lain di area ini."*
- Batalkan schedule pertama → slot kembali terbuka → schedule baru di jam yang sama sekarang **berhasil** dibuat (availability freed, PRD §7.7).

## 5.6 — E2E: Availability View (Stage 3, PRD §7.9)

- Setelah schedule dibuat, tab Availability menampilkan badge status yang benar (mis. terisi "Internal Activity") untuk jam terkait, dan "Available" untuk jam lainnya di area yang sama.

## 5.7 — E2E: Booking Flow & Capacity Validation (Stage 4, PRD §7.10, 9.2)

- Buat booking pada area `E2E_TEST_`, jumlah peserta dalam batas kapasitas → status `PENDING`, muncul di list, dan availability area tersebut berubah jadi "Booked" di jam terkait.
- Coba booking dengan jumlah peserta **melebihi kapasitas area** → ditolak dengan pesan ramah Bahasa Indonesia.
- Batalkan booking → availability area tersebut kembali terbuka.

## 5.8 — Cleanup & Verifikasi Kebersihan Database

- Setiap spec (atau global teardown) menghapus seluruh baris `E2E_TEST_`-prefixed yang dibuat selama pengujian, serta 2 user test (`e2e-test-admin@arayya.test`, `e2e-test-staff@arayya.test`).
- Verifikasi akhir dengan query REST API (service role key) memastikan tidak ada sisa data/​user test di database live.

## 5.9 — Regression Build Check

- `bun run build` dijalankan ulang setelah seluruh dependency testing ditambahkan, untuk memastikan tooling test tidak mengganggu production build.

## Exit Criteria Stage 5.x

Semua sub-stage di atas (5.1–5.9) harus **lulus** sebelum lanjut ke sisa checklist Stage 5 (mobile UAT manual di device asli, dan production deployment final) di [`docs/stage-5-hardening.md`](./stage-5-hardening.md).

---

## Hasil Akhir

**Unit test:** ✅ 23/23 lulus (`bun run test`).

**E2E test:** ✅ 11/11 lulus (`bun run test:e2e`), setelah perbaikan berikut:

### Bug produksi asli yang ditemukan & diperbaiki

1. **Availability grid selalu kosong** (`src/lib/availability.ts`) — `business_hours.open_time`/`close_time` dari Postgres berformat `"HH:mm:ss"` (mis. `"09:00:00"`), tapi `buildHourSlots` mem-parsing dengan pattern `"HH:mm"` sehingga menghasilkan `Invalid Date` dan loop slot tidak pernah berjalan. Akibatnya tab Availability tidak pernah menampilkan slot jam apapun untuk area manapun, di tanggal manapun — bug ini ada di production sebelum ditemukan lewat testing. Diperbaiki dengan menormalkan string waktu (`.slice(0,5)`) sebelum parsing. Bug serupa (perbandingan string `"09:00" < "09:00:00"`) di validasi jam operasional pada form Schedule (`schedule-client.tsx`) juga diperbaiki — sebelumnya schedule yang dimulai persis di jam buka bisa salah ditolak.
2. **Race condition out-of-order response** (`schedule-client.tsx`) — saat tanggal diganti dengan cepat, fetch jadwal untuk tanggal lama yang masih berjalan bisa selesai belakangan dan menimpa balik data tanggal baru yang sudah benar. Diperbaiki dengan token-guard (`latestRequestedDate` ref) yang mengabaikan response basi.
3. **Selected date tidak persist saat reload** — tanggal yang dipilih di halaman Jadwal hanya tersimpan di state client, bukan di URL, sehingga `page.reload()` mengembalikan tampilan ke tanggal hari ini. Ini bukan bug kritikal (tidak melanggar acceptance criteria PRD), tapi dicatat sebagai keterbatasan UX — lihat rekomendasi di bawah.

### Perbaikan test-only (bukan bug aplikasi)

- Selector CSS yang salah menangkap elemen anak, bukan wrapper slot (`div.rounded-xl`).
- Viewport desktop dipakai untuk mengecek nav "Lainnya" yang sebenarnya cuma ada di bottom nav mobile — test disesuaikan pakai viewport ponsel.
- Baris kode debug (`getByLabel(/Tanggal/)`) yang mencari elemen yang tak pernah ada, menghabiskan seluruh timeout test.
- Animasi buka/tutup AlertDialog (Radix) perlu jeda kecil sebelum diklik agar tidak dianggap "not stable" oleh Playwright.
- `page.reload()` yang tidak perlu di test scheduling, yang kena dampak keterbatasan poin 3 di atas.

### Kebersihan database live

Diverifikasi lewat REST API (service role key): 0 baris tersisa dengan prefix `E2E_TEST_` di areas/activities/organizers/schedules/bookings, dan hanya 1 auth user asli (`admin@arraya.id`) yang tersisa — tidak ada user test yang bocor.

### Build

`bun run build` lolos bersih setelah seluruh dependency testing ditambahkan.

### Rekomendasi lanjutan (di luar scope Stage 5.x ini)

- Pertimbangkan menyimpan tanggal terpilih di halaman Jadwal sebagai query param URL (`?date=...`) agar mendukung deep-link dan tahan reload — perbaikan UX kecil, bukan blocker MVP.
- E2E test yang dijalankan terhadap `next dev` (bukan production build) rentan lambat karena kompilasi on-demand di percobaan pertama tiap rute; untuk CI ke depan, pertimbangkan menjalankan e2e terhadap `next build && next start` agar lebih cepat dan stabil.
- Mobile UAT di device fisik asli tetap perlu dilakukan manual (belum tercakup oleh e2e ini, yang berjalan di viewport simulasi).
