# Stage 5 — User Management Plan (Admin Kelola User Lain)

**Status:** Draft — **menunggu review Anda, belum dieksekusi.**
**Sumber:** Diskusi soal perbedaan role Admin/Staff — ditemukan bahwa manajemen user (buat akun, ubah role, nonaktifkan) sepenuhnya masih manual lewat Supabase Dashboard, tidak ada UI di dalam aplikasi.

Dokumen ini merinci rencana membangun fitur **User Management** di dalam aplikasi sendiri, supaya Admin tidak perlu lagi buka Supabase Dashboard untuk hal-hal dasar terkait user.

---

## Context / Kenapa Ini Dibutuhkan

Sesuai PRD §14, hanya ada 2 role: Admin dan Staff. Perbedaan aksesnya sudah jelas dan sudah diimplementasikan (Admin full CRUD master data, Staff read-only + bisa Schedule/Booking). Tapi **tidak ada satu pun UI di aplikasi untuk mengelola user itu sendiri** — membuat user baru, mengubah role seseorang, atau menonaktifkan akun semuanya masih harus dilakukan manual lewat Supabase Dashboard (Authentication → Users) oleh siapa pun yang punya akses ke project Supabase, bukan oleh Admin aplikasi lewat UI yang seharusnya mereka punya otoritasnya.

Ini jadi masalah operasional begitu:
- Ada lebih dari 1-2 orang Admin yang perlu mengelola staff, tapi tidak semuanya punya (atau seharusnya punya) akses ke Supabase Dashboard.
- Perlu approval/kontrol yang lebih terikat ke role aplikasi ("Admin bisa X"), bukan ke siapa yang punya password Supabase Dashboard.

## Cakupan Fitur yang Diusulkan

Halaman baru **`/settings/users`** (khusus Admin), dengan kemampuan:

1. **Lihat daftar user** — email, nama, role (admin/staff), status aktif/nonaktif, tanggal dibuat.
2. **Buat user baru** — isi email, password sementara, pilih role (admin/staff) langsung saat dibuat.
3. **Ubah role user** — promosikan staff → admin, atau turunkan admin → staff.
4. **Nonaktifkan / aktifkan kembali user** — supaya user tidak bisa login tanpa harus menghapus datanya (misal staff resign, tapi histori aktivitasnya tetap perlu ada).
5. **Reset password user** — Admin set password baru untuk user (menggantikan alur forgot-password yang sudah kita putuskan di luar scope MVP; ini kebalikannya — Admin yang bertindak, bukan user sendiri).

## Batasan Keamanan yang Wajib Dijaga

- Semua operasi di atas **menyentuh service role key** (butuh Supabase Admin API untuk create/update/ban user — RLS tidak berlaku untuk operasi ini). Karena itu, **semua logic ini harus jalan di Server Action (server-side)**, tidak pernah di client — service role key tidak boleh pernah terkirim ke browser.
- Server Action itu sendiri **wajib** memverifikasi bahwa pemanggilnya benar-benar Admin (cek session + `profiles.role`) sebelum melakukan apa pun — karena begitu masuk ke server action yang memakai service role, RLS tidak lagi jadi pengaman otomatis.
- **Tidak boleh admin menghapus/menurunkan role dirinya sendiri** kalau itu akan membuat sistem tanpa admin sama sekali (cek: minimal 1 admin aktif harus selalu ada).
- Aksi destruktif (nonaktifkan user, ubah role) sebaiknya ada konfirmasi (dialog "Yakin?") di UI, konsisten dengan pola yang sudah ada di app ini (AlertDialog).

## Rencana Implementasi (Aksi)

### 1. Skema & Data
- Cek apakah `profiles` perlu kolom tambahan: `email` (supaya list user tidak perlu extra round-trip ke `auth.users` tiap render) dan `is_active` (boolean, default `true`) untuk status nonaktif — perlu migration baru (`0004_user_management.sql`).
- Update trigger `handle_new_user` supaya menyalin email ke `profiles.email` juga saat user baru dibuat.
- RLS: pastikan hanya admin yang bisa `UPDATE` kolom `role`/`is_active` di `profiles` milik user lain (kemungkinan sudah tercakup policy admin-only write yang ada, perlu ditinjau ulang).

### 2. Server Actions (baru, di `src/app/(app)/settings/users/actions.ts`)
- `createUserAction(email, password, role)` — pakai `supabase.auth.admin.createUser()` (service role), lalu set role via update `profiles`.
- `updateUserRoleAction(userId, role)` — update `profiles.role`, dengan guard "minimal 1 admin aktif".
- `toggleUserActiveAction(userId, isActive)` — kombinasi update `profiles.is_active` **dan** `supabase.auth.admin.updateUserById(userId, { ban_duration: ... })` supaya user yang nonaktif juga benar-benar tidak bisa login (bukan cuma ditandai di data).
- `resetUserPasswordAction(userId, newPassword)` — `supabase.auth.admin.updateUserById(userId, { password: newPassword })`.
- Setiap action: cek dulu pemanggilnya admin (baca session di server), baru lanjut.

### 3. UI (`src/app/(app)/settings/users/page.tsx` + `users-client.tsx`)
- Ikuti pola halaman settings yang sudah ada (business-hours) — table + dialog create + dialog confirm untuk aksi sensitif.
- Tambah link "Pengguna" di menu Pengaturan (sidebar `AppShell.tsx` dan halaman `/more` untuk mobile).
- Badge visual untuk role (Admin/Staff) dan status (Aktif/Nonaktif), konsisten dengan Badge yang sudah dipakai di halaman lain.

### 4. Testing
- Unit test untuk logic "minimal 1 admin aktif" (fungsi murni, mudah ditest tanpa DB).
- E2e test baru (`tests/e2e/user-management.spec.ts`): admin bisa buat user baru dengan role staff, staff yang login TIDAK bisa akses halaman `/settings/users` (redirect atau 403), admin bisa ubah role & nonaktifkan user test, lalu bersihkan data test seperti biasa.

## Pertanyaan yang Perlu Anda Konfirmasi Sebelum Eksekusi

1. **Nonaktifkan user** — pakai pendekatan "ban" via Supabase Admin API (user betul-betul tidak bisa login), atau cukup flag `is_active` di data (lebih sederhana tapi user masih bisa login kalau tidak dicek di middleware juga)? *Rekomendasi: kombinasi keduanya seperti di rencana di atas, demi konsistensi.*
2. **Siapa yang bisa dibuat sebagai Admin baru** — apakah semua Admin existing bisa mempromosikan siapa pun jadi Admin baru, atau perlu dibatasi lebih jauh (misal butuh "Superadmin" khusus, seperti yang kita bahas sebelumnya)? Dokumen ini **mengasumsikan semua Admin setara** (tidak ada tingkatan Superadmin) — kalau Anda mau tingkatan itu, perlu jadi dokumen plan terpisah karena scope-nya berbeda.
3. **Reset password oleh Admin** — cukup Admin set password baru langsung (Admin tahu password baru itu, lalu kasih tahu user manual), atau perlu Supabase kirim email ke user untuk set sendiri? Dokumen ini mengasumsikan opsi pertama (lebih sederhana, konsisten dengan keputusan sebelumnya untuk tidak membangun flow reset-password mandiri user).

## Verifikasi (setelah eksekusi, kalau disetujui)

- Build lolos, unit test baru lulus, e2e baru lulus, e2e existing tidak regresi.
- Manual: login sebagai admin baru yang dibuat lewat fitur ini untuk pastikan role-nya benar; login sebagai user yang di-nonaktifkan untuk pastikan benar-benar tidak bisa masuk.
