# Stage 5 — User Management Plan (Admin Kelola User Lain)

**Status:** Draft — **menunggu review Anda, belum dieksekusi.**
**Sumber:** Diskusi soal perbedaan role Admin/Staff — ditemukan bahwa manajemen user (buat akun, ubah role, nonaktifkan) sepenuhnya masih manual lewat Supabase Dashboard, tidak ada UI di dalam aplikasi. Desain UI diperkaya dari analisis referensi aplikasi "Lovin Milk" (halaman Manajemen Pengguna mereka).

Dokumen ini merinci rencana membangun fitur **User Management** di dalam aplikasi sendiri, supaya Admin tidak perlu lagi buka Supabase Dashboard untuk hal-hal dasar terkait user.

---

## Context / Kenapa Ini Dibutuhkan

Sesuai PRD §14, hanya ada 2 role: Admin dan Staff. Perbedaan aksesnya sudah jelas dan sudah diimplementasikan (Admin full CRUD master data, Staff read-only + bisa Schedule/Booking). Tapi **tidak ada satu pun UI di aplikasi untuk mengelola user itu sendiri** — membuat user baru, mengubah role seseorang, atau menonaktifkan akun semuanya masih harus dilakukan manual lewat Supabase Dashboard (Authentication → Users) oleh siapa pun yang punya akses ke project Supabase, bukan oleh Admin aplikasi lewat UI yang seharusnya mereka punya otoritasnya.

Ini jadi masalah operasional begitu:
- Ada lebih dari 1-2 orang Admin yang perlu mengelola staff, tapi tidak semuanya punya (atau seharusnya punya) akses ke Supabase Dashboard.
- Perlu approval/kontrol yang lebih terikat ke role aplikasi ("Admin bisa X"), bukan ke siapa yang punya password Supabase Dashboard.

## Analisis Referensi (Lovin Milk) & Keputusan Desain

Ditinjau dari screenshot halaman "Manajemen Pengguna" aplikasi Lovin Milk. Yang **diadopsi** dan yang **tidak**:

**Diadopsi (cocok untuk Arayya):**
- Layout tabel: Nama · Peran (dropdown inline, langsung ubah role tanpa dialog terpisah) · Status (badge) · Dibuat (tanggal) · Aktif (toggle switch).
- Search by nama.
- **Self-row protection** — baris milik user yang sedang login sendiri di-lock (dropdown role & toggle aktif disabled), supaya tidak ada yang bisa menurunkan/menonaktifkan dirinya sendiri secara tidak sengaja.

**Tidak diadopsi — provisioning via self-signup:**
Referensi itu memakai model *user daftar sendiri lewat halaman auth publik → Super Admin approve/atur role setelahnya*. Ditolak untuk Arayya karena dua alasan konkret dari diskusi kita:
1. Arayya adalah tim kecil yang stafnya sudah diketahui pasti — tidak ada kebutuhan "orang asing daftar sendiri lalu di-approve". Admin memang seharusnya proaktif yang membuat akun.
2. **Email di Arayya hanya dipakai sebagai identitas login** (untuk keperluan auto-confirm di Supabase), bukan alamat yang benar-benar dicek pemiliknya. Model self-signup (dan juga model invite-by-email yang tadinya saya usulkan) sama-sama butuh email yang *reachable* — user harus benar-benar menerima & klik email untuk lanjut. Karena email di sini tidak dijamin reachable, **kedua model itu tidak akan berfungsi**.

**Keputusan final:** Admin membuat akun **langsung** (isi email + password sementara + role saat itu juga), user langsung bisa login pakai kredensial itu — tidak ada email verifikasi/undangan yang dikirim sama sekali. Ini juga sekaligus menjawab pertanyaan lama soal reset password: Admin set password baru langsung dengan cara yang sama, tanpa tergantung email.

## Cakupan Fitur

Halaman baru **`/settings/users`** (khusus Admin), dengan kemampuan:

1. **Lihat daftar user** — tabel: Nama, Email (identitas), Peran (dropdown inline: Admin/Staff), Status (badge Aktif/Nonaktif), Dibuat (tanggal), toggle Aktif. Ada search by nama.
2. **Buat user baru** — dialog: isi nama, email (identitas), password sementara, pilih role. Langsung aktif begitu dibuat.
3. **Ubah role user** — lewat dropdown inline di tabel (bukan dialog terpisah), sesuai referensi.
4. **Nonaktifkan / aktifkan kembali user** — lewat toggle switch inline di tabel.
5. **Reset password user** — Admin set password baru langsung lewat dialog kecil (tombol per-baris), tanpa email.
6. **Self-row protection** — baris user yang sedang login: dropdown role & toggle aktif di-disable, tidak bisa mengubah/menonaktifkan diri sendiri.

## Batasan Keamanan yang Wajib Dijaga

- Semua operasi di atas **menyentuh service role key** (butuh Supabase Admin API untuk create/update/ban user — RLS tidak berlaku untuk operasi ini). Karena itu, **semua logic ini harus jalan di Server Action (server-side)**, tidak pernah di client — service role key tidak boleh pernah terkirim ke browser.
- Server Action itu sendiri **wajib** memverifikasi bahwa pemanggilnya benar-benar Admin (cek session + `profiles.role`) sebelum melakukan apa pun — karena begitu masuk ke server action yang memakai service role, RLS tidak lagi jadi pengaman otomatis.
- **Tidak boleh admin menurunkan role/menonaktifkan dirinya sendiri** — selain karena self-row protection di UI, guard ini juga wajib ditegakkan di server action itu sendiri (jangan cuma andalkan UI), dan wajib ada pengecekan "minimal 1 admin aktif harus selalu ada" untuk operasi terhadap user lain juga (supaya tidak ada kombinasi aksi yang bisa menghabiskan semua admin).
- Aksi destruktif (nonaktifkan user, ubah role) sebaiknya ada konfirmasi (dialog "Yakin?"), konsisten dengan pola yang sudah ada di app ini (AlertDialog).
- Password sementara yang di-set Admin sebaiknya punya syarat minimum (misal 8 karakter) dan ditampilkan admin dengan jelas sekali saja setelah dibuat (mis. dalam toast/dialog "User dibuat, password: ...") supaya bisa disampaikan ke user — bukan disimpan/ditampilkan ulang di mana pun setelahnya.

## Rencana Implementasi (Aksi)

### 1. Skema & Data
- Tambah kolom di `profiles`: `email` (salinan dari `auth.users.email`, supaya list tidak perlu round-trip ke admin API tiap render) dan `is_active` (boolean, default `true`) — migration baru `0004_user_management.sql`.
- Update trigger `handle_new_user` supaya menyalin email ke `profiles.email` juga saat user baru dibuat.
- RLS: pastikan hanya admin yang bisa `UPDATE` kolom `role`/`is_active` di `profiles` milik user lain (tinjau ulang policy yang sudah ada di `0001_init.sql`).

### 2. Server Actions (baru, di `src/app/(app)/settings/users/actions.ts`)
- `createUserAction(name, email, password, role)` — pakai `supabase.auth.admin.createUser()` (service role, `email_confirm: true` supaya tidak perlu verifikasi email), lalu set nama+role di `profiles`.
- `updateUserRoleAction(userId, role)` — update `profiles.role`. Guard: tolak kalau target adalah diri sendiri, atau kalau ini akan membuat 0 admin aktif.
- `toggleUserActiveAction(userId, isActive)` — update `profiles.is_active` **dan** `supabase.auth.admin.updateUserById(userId, { ban_duration: ... })` supaya user nonaktif benar-benar tidak bisa login. Guard sama seperti di atas.
- `resetUserPasswordAction(userId, newPassword)` — `supabase.auth.admin.updateUserById(userId, { password: newPassword })`.
- Setiap action: cek dulu pemanggilnya admin (baca session di server) sebelum lanjut.

### 3. UI (`src/app/(app)/settings/users/page.tsx` + `users-client.tsx`)
- Tabel ala referensi: Nama, Email, Peran (Select inline), Status (Badge), Dibuat, Aktif (Switch inline).
- Baris milik diri sendiri: Select & Switch di-disable, ditandai teks kecil "(Anda)" di bawah nama — konsisten dengan referensi.
- Dialog "Tambah User" (form: nama, email, password, role) dan dialog kecil "Reset Password" per-baris.
- Tambah link "Pengguna" di menu Pengaturan (sidebar `AppShell.tsx` dan halaman `/more` untuk mobile).

### 4. Testing
- Unit test untuk logic guard "tidak bisa membuat 0 admin aktif" (fungsi murni, mudah ditest tanpa DB).
- E2e test baru (`tests/e2e/user-management.spec.ts`): admin bisa buat user baru dengan role staff dan langsung login pakai kredensial itu; staff yang login TIDAK bisa akses halaman `/settings/users`; admin bisa ubah role & nonaktifkan user test lewat kontrol inline; baris admin sendiri terverifikasi disabled; bersihkan data test seperti biasa.

## Pertanyaan yang Masih Terbuka

1. **Tingkatan role** — tetap 2 tingkat (Admin/Staff) seperti sekarang, atau tambah "Super Admin" di atas Admin (dibahas sebelumnya)? Dokumen ini ditulis generik (kolom Peran bisa berisi role apa pun) supaya mudah diperluas ke 3 tingkat nanti kalau dibutuhkan, tapi implementasi awal defaultnya tetap 2 tingkat kecuali Anda konfirmasi sebaliknya.
2. **Panjang/kompleksitas minimum password sementara** — cukup ikut aturan yang sudah ada di form login (`min 6 karakter`), atau dinaikkan jadi lebih ketat khusus untuk fitur ini?

## Verifikasi (setelah eksekusi, kalau disetujui)

- Build lolos, unit test baru lulus, e2e baru lulus, e2e existing tidak regresi.
- Manual: buat user baru lewat fitur ini, langsung coba login pakai kredensial yang di-set; nonaktifkan user test lalu pastikan benar-benar tidak bisa login; pastikan baris akun yang sedang login sendiri terlihat ter-lock di UI.
