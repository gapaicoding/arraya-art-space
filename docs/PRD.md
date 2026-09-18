# Product Requirements Document (PRD)
# Arayya Art & Space — Activity & Space Management

**Versi:** 1.0
**Tanggal:** 14 September 2026
**Status:** Draft untuk Development & Internal Review
**Disusun berdasarkan:** Brief kebutuhan operasional Arayya Art & Space

---

## 1. Executive Summary

Ringkasan:
- Apa itu Arayya Activity & Space Management.
- Masalah operasional yang ingin diselesaikan.
- Konsep Area → Activity → Schedule → Availability → Booking.
- Mobile-first untuk operasional.
- Next.js + Supabase + Vercel.
- Arah jangka panjang menuju Kids Center / Activity Hub.

---

## 2. Latar Belakang & Peluang

### 2.1 Kondisi Saat Ini
- Penggunaan area/ruangan perlu terkoordinasi.
- Kegiatan Arayya memiliki jadwal berbeda.
- Ada kemungkinan penggunaan area oleh pihak eksternal.
- Risiko jadwal bentrok.
- Availability sulit terlihat jika dikelola manual.

### 2.2 Masalah Utama
- Tidak ada single source of truth jadwal.
- Sulit mengetahui area tersedia.
- Risiko double booking.
- Jadwal internal dan external booking bercampur.
- Operasional membutuhkan akses dari HP.

### 2.3 Opportunity Statement
Membangun sistem operasional terpusat untuk mengelola:
Area → Aktivitas → Jadwal → Availability → Booking.

---

## 3. Tujuan Produk (Goals)

1. Menyediakan satu sistem jadwal seluruh area Arayya.
2. Mencegah double booking.
3. Mempermudah staff melihat availability.
4. Mempermudah pencatatan kegiatan internal.
5. Mempermudah reservasi pihak eksternal.
6. Memberikan calendar view yang mobile-friendly.
7. Menjadi fondasi sistem Kids Center di masa depan.

### Non-Goals MVP
- Membership.
- Enrollment anak.
- Payment gateway.
- Attendance.
- Instructor management.
- Class package.
- Parent portal.
- Public self-booking.
- Accounting.
- POS.

---

## 4. Target Pengguna & Persona

| # | Persona | Kebutuhan Utama |
|---|---|---|
| 1 | Admin Arayya | Mengatur seluruh master data dan sistem |
| 2 | Staff Operasional | Melihat jadwal, availability, membuat booking |
| 3 | Management | Melihat penggunaan area dan aktivitas |
| 4 | External Organizer | Dicatat sebagai penyelenggara kegiatan eksternal |
| 5 | Customer / Renter | Fase lanjut: melakukan reservasi langsung |

---

## 5. Arsitektur Modul Produk

ARAYYA ACTIVITY & SPACE MANAGEMENT

├── 1. Authentication & User Management
├── 2. Dashboard
├── 3. Master Area / Room
├── 4. Master Activity
├── 5. Organizer
├── 6. Business Hours
├── 7. Schedule Management
├── 8. Time Slot & Availability
├── 9. Booking / Reservation
├── 10. Calendar / Schedule View
├── 11. Settings
└── 12. Reporting / Analytics (future)

Future Kids Center:

├── Membership
├── Child Profile
├── Parent / Guardian
├── Program
├── Class
├── Enrollment
├── Instructor
├── Attendance
├── Payment
└── Partner / Organizer Portal

---

## 6. Prioritas MVP (Fase 1)

| Prioritas | Modul | Alasan |
|---|---|---|
| P0 | Auth & Role | Security foundation |
| P0 | Area / Room | Fondasi resource |
| P0 | Activity | Fondasi kegiatan |
| P0 | Schedule | Core operational system |
| P0 | Availability | Menentukan area tersedia |
| P0 | Booking | Core reservation flow |
| P0 | Calendar View | Interface operasional harian |
| P1 | Organizer | Mendukung kegiatan eksternal |
| P1 | Business Hours | Membatasi jadwal valid |
| P1 | Dashboard | Ringkasan operasional |
| P2 | Reporting | Setelah data penggunaan terkumpul |

---

## 7. Functional Requirements

### 7.1 Authentication & User Management
- Login.
- Logout.
- Session management.
- Role Admin.
- Role Staff.
- Protected route.
- Supabase Auth.
- Profile user.

### 7.2 Dashboard
- Jadwal hari ini.
- Area digunakan.
- Area tersedia.
- Booking hari ini.
- Upcoming activities.
- Quick action.
- Alert jika terdapat konflik atau informasi operasional.

### 7.3 Master Area / Room

Data:
- Area name.
- Code.
- Description.
- Capacity.
- Location.
- Status.
- Active/inactive.

Fitur:
- Create.
- Read.
- Update.
- Disable/archive.
- Search.
- Filter.

Business rules:
- Area inactive tidak dapat menerima schedule baru.
- Capacity harus > 0.
- Historical schedule tidak ikut terhapus.

### 7.4 Master Activity

Data:
- Activity name.
- Category.
- Description.
- Default duration.
- Organizer.
- Capacity recommendation.
- Status.

Contoh:
- Melukis.
- Canvas.
- Kids Gym.
- Panahan.
- Workshop.
- Birthday Activity.
- External Event.

### 7.5 Organizer

Jenis:
- Internal — Arayya.
- External.

Data:
- Name.
- Type.
- PIC.
- Phone.
- Email.
- Notes.
- Status.

### 7.6 Business Hours

Per hari:

Monday    09:00–18:00
Tuesday   09:00–18:00
...
Sunday    configurable

Fitur:
- Jam buka berbeda tiap hari.
- Hari tutup.
- Validasi schedule terhadap jam operasional.

### 7.7 Schedule Management

Jenis schedule:
- Internal Activity.
- External Booking.
- Blocked Time.

Data:
- Date.
- Area.
- Start time.
- End time.
- Activity.
- Organizer.
- Capacity.
- Notes.
- Status.

Rules:
- `end_at > start_at`
- Tidak boleh overlap pada area sama.
- Area harus aktif.
- Schedule berada dalam business hours.
- Cancelled schedule tidak mengunci availability.

### 7.8 Time Slot

Display interval:

1 slot = 1 jam.

Contoh:

09:00
10:00
11:00
12:00
...

CATATAN:
Database tidak menyimpan slot sebagai record tetap.

Database menyimpan:

start_at
end_at

Slot 1 jam hanya digunakan sebagai presentation layer.

### 7.9 Availability

Status:

AVAILABLE
INTERNAL ACTIVITY
BOOKED
BLOCKED
CLOSED

Availability dihitung dari:

Business Hours
+
Area Status
+
Existing Schedule

### 7.10 Booking / Reservation

Data:
- Booking number.
- Customer / Organizer.
- Contact person.
- Phone.
- Area.
- Date.
- Start.
- End.
- Participant count.
- Purpose/activity.
- Notes.
- Booking status.

Status:

PENDING
CONFIRMED
CANCELLED
COMPLETED

Rules:
- Booking hanya dapat dibuat jika area available.
- Capacity tidak boleh melebihi area.
- Confirmed booking mengunci area.
- Cancelled booking membuka kembali availability.

### 7.11 Calendar / Schedule View

View:
- Today.
- Day.
- Week.

Mobile-first.

User harus mudah melihat:

Area A
09:00 Available
10:00 Painting
11:00 Painting
12:00 Available

Area B
09:00 Booking
10:00 Booking
...

### 7.12 Admin Management

Admin dapat mengelola:
- Area.
- Activity.
- Organizer.
- Business hours.
- Schedule.
- Booking.
- User.
- Settings.

---

## 8. Business Rules & Data Integrity

### 8.1 Anti Double Booking

Database harus menjadi authority.

Tidak cukup:

Frontend → cek availability → insert.

Harus ada database constraint terhadap:

area_id
+
time range

Menggunakan PostgreSQL exclusion constraint.

### 8.2 Schedule sebagai Single Source of Truth

Semua okupansi area masuk:

schedules

Types:
- internal_activity
- external_booking
- blocked

Booking memiliki relasi ke schedule.

### 8.3 Historical Integrity

Master data tidak boleh hard-delete jika sudah digunakan schedule.

Gunakan:
- active/inactive
atau
- archived_at

---

## 9. User Flow

### 9.1 Internal Activity

Login
↓
Schedule
↓
Select date
↓
Select area
↓
Select activity
↓
Select start/end
↓
Check availability
↓
Save
↓
Schedule appears on calendar

### 9.2 External Booking

Login
↓
Booking
↓
New Booking
↓
Customer / Organizer
↓
Select date
↓
Select area
↓
Select time
↓
Availability validation
↓
Save booking
↓
Create schedule
↓
Area becomes booked

### 9.3 Availability Check

Select date
↓
System reads business hours
↓
System reads active areas
↓
System reads schedules
↓
Generate time grid
↓
Display availability

---

## 10. Wireframe & UI Requirement

> Diperbarui sesuai implementasi aktual (deskripsi struktur UI, bukan gambar/mockup visual — lihat kode di `src/app/(app)/` untuk detail tampilan sesungguhnya).

### 10.1 Login
Form Email + Password, logo Arayya, link ke halaman lain tidak ada (tidak ada self-signup/forgot-password — akun dibuat Admin lewat Manajemen Pengguna). Pesan error "Email atau password salah." untuk kredensial salah.

### 10.2 Dashboard
Kartu sambutan + 3 quick action (+ Buat Jadwal, + Buat Booking, Lihat Availability Area). Alert konflik (merah, hanya muncul jika ada — seharusnya tidak pernah terjadi karena dicegah di level database) dengan tombol langsung ke halaman Jadwal. Grid statistik: Jadwal Hari Ini, Booking Hari Ini, Area Digunakan, Area Tersedia. List "Jadwal Hari Ini" dan "Aktivitas Mendatang" (5 item berikutnya). Kartu Total Area & Area Aktif. Badge merah jumlah konflik juga muncul di item nav "Dashboard" (sidebar & bottom nav) supaya terlihat dari halaman manapun.

### 10.3 Schedule Calendar
Halaman "Jadwal" — date picker di atas, lalu 2 tab: **Daftar Jadwal** (tabel: Jam, Area, Jenis, Detail, Status, Aksi — dengan Edit/Batalkan) dan **Availability** (lihat 10.5).

### 10.4 Create Schedule
Dialog: Tanggal, Area (select), Jenis Jadwal (Aktivitas Internal/Booking Eksternal/Blocked), Aktivitas (select, wajib jika jenis internal), Organizer (select, opsional), Jam Mulai, Jam Selesai, Kapasitas (opsional), Catatan. Validasi: jam selesai > jam mulai, dalam jam operasional, area harus aktif; konflik jadwal ditolak dengan pesan "Jadwal bertabrakan dengan jadwal lain di area ini."

### 10.5 Availability
Tab di halaman Jadwal — grid per area, badge per jam berwarna sesuai status: Tersedia (hijau), Aktivitas Internal, Booking, Diblokir, Tutup.

### 10.6 Booking List
Halaman "Booking" — search box (nama customer/organizer atau no. booking) + filter status (Semua/Pending/Konfirmasi/Dibatalkan/Selesai) + tabel dengan pagination server-side (20 baris/halaman): No. Booking, Customer/Organizer, Area, Tanggal & Jam, Status, Aksi.

### 10.7 Booking Detail
Dialog: seluruh info booking + status saat ini. Tombol aksi kontekstual sesuai status: Konfirmasi (dari Pending), Selesaikan (dari Konfirmasi), Batalkan Booking (dengan dialog konfirmasi — membatalkan booking sekaligus membuka kembali availability area).

### 10.8 Create Booking
Dialog: Nama Customer/Organizer, Contact Person, Telepon, Area (select, tampil kapasitas), Tanggal, Jam Mulai/Selesai, Jumlah Peserta (divalidasi ≤ kapasitas area), Tujuan/Aktivitas, Aktivitas Terkait (opsional), Organizer (opsional), Catatan.

### 10.9 Area Management
Tabel (Nama, Kode, Kapasitas, Lokasi, Status, Aksi) + search + pagination server-side. Tombol Tambah/Edit/Nonaktifkan hanya untuk Admin (Staff read-only).

### 10.10 Activity Management
Tabel (Nama, Kategori, Durasi, Organizer, Status, Aksi) + search + pagination. Sama seperti Area, tulis hanya untuk Admin.

### 10.11 Organizer Management
Tabel (Nama, Tipe, PIC, Kontak, Status, Aksi) + search + pagination. Sama, tulis hanya untuk Admin.

### 10.12 Business Hours
7 baris tetap (Senin–Minggu), masing-masing: toggle Buka/Tutup + input Jam Buka/Tutup (disembunyikan jika Tutup). Hanya Admin yang bisa mengubah.

### 10.13 User Management
Tabel (Nama, Email, Peran [dropdown inline Admin/Staff], Status [badge Aktif/Nonaktif], Dibuat, toggle Aktif) + search + tombol "+ User Baru" + tombol "Reset Password" per baris. Baris milik user yang sedang login sendiri di-lock (dropdown & toggle disabled, ditandai "(Anda)") supaya tidak bisa mendemote/menonaktifkan diri sendiri. Khusus Admin — Staff yang mencoba akses URL-nya langsung di-redirect ke Dashboard.

### 10.14 Settings
Diimplementasikan sebagai menu "Pengaturan" (sidebar desktop, link langsung ke Jam Operasional) dan halaman "Lainnya" (bottom nav mobile) yang mengumpulkan link ke Master Area, Master Aktivitas, Organizer, Jam Operasional, dan Manajemen Pengguna (khusus Admin) dalam satu list, plus tombol Keluar.

Mobile bottom navigation (sesuai implementasi):

Dashboard
Jadwal
Booking
Lainnya

---

## 11. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Mobile UX | Primary workflow nyaman pada smartphone |
| Security | Supabase Auth + PostgreSQL RLS |
| Authorization | Admin dan Staff memiliki akses berbeda |
| Data Integrity | Database-level overlap protection |
| Performance | Operational page target <2 detik |
| Availability | Sistem harus tetap konsisten pada concurrent booking |
| Auditability | created_by / updated_by untuk transaksi utama |
| Timezone | Asia/Jakarta |
| Localization | Bahasa Indonesia sebagai default |
| Accessibility | Touch target nyaman untuk mobile |
| Scalability | Database siap berkembang ke Kids Center |
| Backup | Mengikuti Supabase backup strategy |
| Deployment | Vercel |

---

## 12. Rekomendasi Arsitektur & Tech Stack

### 12.1 Web Application

| Layer | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| UI | React + Tailwind CSS |
| Components | shadcn/ui |
| Forms | React Hook Form |
| Validation | Zod |
| Deployment | Vercel |

### 12.2 Backend

Supabase:
- PostgreSQL.
- Auth.
- Data API.
- RLS.
- RPC/database function.
- Storage jika dibutuhkan nanti.

### 12.3 Database

Core tables:

profiles
areas
activities
organizers
business_hours
schedules
bookings

### 12.4 Security

Browser
↓
Supabase Auth
↓
Data API
↓
Postgres Grants
↓
RLS
↓
PostgreSQL

### 12.5 Scheduling Engine

Business Hours
+
Area
+
Schedule
↓
Availability Engine

---

## 13. Database Model

> Diperbarui sesuai implementasi aktual — lihat `supabase/migrations/0001_init.sql` (skema awal) dan `supabase/migrations/0004_user_management.sql` (kolom tambahan). Semua tabel mengaktifkan Row Level Security (RLS); lihat §14 untuk matriks izin per role.

### profiles

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | = `auth.users.id` (relasi 1:1 dengan akun Supabase Auth) |
| full_name | text, nullable | |
| role | text | `admin` \| `staff`, default `staff` |
| email | text, nullable | Disalin dari `auth.users.email` saat akun dibuat/diperbarui (untuk tampilan di Manajemen Pengguna tanpa round-trip ke Admin API) |
| is_active | boolean | default `true`; `false` = akun dinonaktifkan (dikombinasikan dengan ban di level Supabase Auth) |
| created_at | timestamptz | |

### areas

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| code | text, unique | |
| description | text, nullable | |
| capacity | integer | harus > 0 (CHECK constraint) |
| location | text, nullable | |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### organizers

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| type | text | `internal` \| `external` |
| pic_name | text, nullable | |
| phone | text, nullable | |
| email | text, nullable | |
| notes | text, nullable | |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### activities

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| category | text, nullable | |
| description | text, nullable | |
| default_duration_minutes | integer | harus > 0, default 60 |
| organizer_id | uuid, FK → organizers, nullable | `on delete set null` |
| capacity_recommendation | integer, nullable | |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### business_hours

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| day_of_week | integer, unique | 0 (Minggu) – 6 (Sabtu) |
| is_closed | boolean | default `false` |
| open_time | time, nullable | null jika `is_closed` |
| close_time | time, nullable | null jika `is_closed` |
| updated_at | timestamptz | |
| updated_by | uuid, FK → profiles | |

### schedules

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| area_id | uuid, FK → areas | not null |
| activity_id | uuid, FK → activities, nullable | `on delete set null` |
| organizer_id | uuid, FK → organizers, nullable | `on delete set null` |
| type | text | `internal_activity` \| `external_booking` \| `blocked` |
| date | date | |
| start_at, end_at | timestamptz | CHECK `end_at > start_at` |
| capacity | integer, nullable | |
| notes | text, nullable | |
| status | text | `draft` \| `confirmed` \| `cancelled` \| `completed`, default `draft` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

**Constraint anti-tabrakan (§8.1):** `EXCLUDE USING gist (area_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE (status <> 'cancelled')` — mencegah dua schedule aktif (bukan cancelled) tumpang tindih waktu di area yang sama, ditegakkan di level database (bukan cuma validasi aplikasi).

### bookings

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| booking_number | text, unique | auto-generate format `BK-YYYYMMDD-0001` |
| schedule_id | uuid, FK → schedules | not null — booking selalu punya schedule terkait |
| customer_organizer_name | text | not null |
| contact_person | text, nullable | |
| phone | text, nullable | |
| participant_count | integer, nullable | divalidasi ≤ kapasitas area saat insert (fungsi `create_booking`) |
| purpose | text, nullable | |
| notes | text, nullable | |
| status | text | `pending` \| `confirmed` \| `cancelled` \| `completed`, default `pending` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

**Fungsi RPC transaksional** (`supabase/migrations/0002_booking_rpc.sql`): `create_booking(...)` membuat `schedules` + `bookings` sekaligus dalam satu transaksi (termasuk validasi kapasitas), dan `cancel_booking(booking_id)` membatalkan booking + schedule terkait sekaligus — supaya availability selalu konsisten dengan status booking.

Relasi utama:

Area
   │
   └── Schedule
          │
          ├── Activity
          │
          ├── Organizer
          │
          └── Booking

---

## 14. Role & Permission Matrix

| Feature | Admin | Staff |
|---|---:|---:|
| Dashboard | ✅ | ✅ |
| View Schedule | ✅ | ✅ |
| Create Schedule | ✅ | ✅ |
| Edit Schedule | ✅ | ✅ |
| Booking | ✅ | ✅ |
| Area CRUD | ✅ | Read |
| Activity CRUD | ✅ | Read |
| Organizer CRUD | ✅ | Read |
| Business Hours | ✅ | Read |
| User Management | ✅ | ❌ |
| System Settings | ✅ | ❌ |

> **Status implementasi:** seluruh baris di atas sudah diimplementasikan dan diverifikasi (termasuk User Management — lihat §10.13, §13, dan `docs/stage-5-user-management-plan.md` untuk detail). Staff yang mencoba mengakses halaman admin-only (Manajemen Pengguna) langsung di-redirect; percobaan bypass langsung lewat API (melewati UI) juga tetap ditolak oleh RLS di level database, sudah diverifikasi terhadap production.

---

## 15. Status Lifecycle

### Schedule

DRAFT
CONFIRMED
CANCELLED
COMPLETED

### Booking

PENDING
CONFIRMED
CANCELLED
COMPLETED

### Area

ACTIVE
INACTIVE

---

## 16. Roadmap Implementasi (Stage-by-Stage)

### Stage 0 — Foundation

- Next.js setup.
- Supabase setup.
- Environment.
- Authentication.
- Profile.
- RLS.
- Layout.
- Design system.

Output:
Aplikasi dapat login secara aman.

### Stage 1 — Master Data

- Area.
- Activity.
- Organizer.
- Business Hours.

Output:
Admin dapat mempersiapkan data operasional.

### Stage 2 — Scheduling Engine

- Schedule CRUD.
- Conflict validation.
- Business-hour validation.
- Calendar.

Output:
Aktivitas internal dapat dijadwalkan.

### Stage 3 — Availability

- Time grid.
- Area availability.
- Mobile schedule view.
- Status visual.

Output:
Staff dapat mengetahui area kosong dengan cepat.

### Stage 4 — Booking

- Booking CRUD.
- External organizer.
- Reservation workflow.
- Capacity validation.
- Booking → Schedule transaction.

Output:
Reservasi eksternal siap digunakan.

### Stage 5 — Operational Hardening

- Audit.
- RLS verification.
- Concurrency testing.
- Mobile UAT.
- Error handling.
- Production deployment.

Output:
MVP siap operasional.

**Status: ✅ Selesai**, dengan improvement tambahan yang dikerjakan setelah output awal Stage 5 tercapai (unit test + e2e test menyeluruh, verifikasi RLS langsung ke production, UAT mobile fisik, pagination, dukungan e2e WebKit, alert konflik dashboard, dan fitur Manajemen Pengguna). Detail lengkap tiap sub-tahap ada di `docs/stage-5-testing-plan.md`, `docs/stage-5-p0-improve-plan.md`, `docs/stage-5-p1-improve-plan.md`, `docs/stage-5-p2-improve-plan.md`, dan `docs/stage-5-user-management-plan.md`.

### Stage 6 — Reporting

- Occupancy.
- Activity frequency.
- Booking metrics.
- Utilization.

### Stage 7 — Kids Center Foundation

- Child.
- Guardian.
- Membership.
- Program.
- Class.
- Instructor.
- Enrollment.
- Attendance.

### Stage 8 — Commercial Expansion

- Payment.
- Packages.
- Public booking.
- Customer portal.
- Partner portal.
- Notifications.

---

## 17. Future Kids Center Architecture

Customer / Guardian
      │
      ├── Child
      │
      └── Membership

Program
   │
   └── Class
        │
        ├── Enrollment
        ├── Instructor
        └── Class Session
               │
               └── Schedule
                       │
                       └── Area

Dengan demikian scheduling engine MVP tidak perlu diganti.

---

## 18. Success Metrics

### Operational
- Jumlah schedule per minggu.
- % booking tanpa konflik.
- Waktu yang dibutuhkan staff membuat booking.
- Occupancy rate area.
- Number of bookings.
- Cancellation rate.

### Adoption
- Active staff.
- Daily login.
- Schedule creation rate.

### Reliability
- Double booking incident = 0.
- Invalid schedule = 0.
- Unauthorized access = 0.

---

## 19. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Double booking | PostgreSQL exclusion constraint |
| Dua staff booking bersamaan | Database transaction |
| Staff salah memilih area | Availability + capacity validation |
| Master data terhapus | Archive / inactive, bukan hard delete |
| Permission bocor | Supabase RLS |
| Scope Kids Center masuk terlalu cepat | Freeze MVP scope |
| UI kalender sulit di HP | Mobile-first day view |
| Data lama rusak akibat perubahan | Migration + historical integrity |

---

## 20. MVP Acceptance Criteria

MVP dianggap selesai jika:

- Admin dapat login.
- Admin dapat mengelola Area.
- Admin dapat mengelola Activity.
- Admin dapat mengelola Organizer.
- Business Hours berfungsi.
- Staff dapat membuat schedule.
- Sistem mencegah schedule bentrok.
- Availability dapat dilihat berdasarkan area dan waktu.
- Staff dapat membuat external booking.
- Booking mengunci availability.
- Cancel booking membuka availability.
- Calendar nyaman digunakan melalui HP.
- Permission Admin/Staff berjalan.
- RLS telah diuji.
- Production build berhasil.
- Production deployment berhasil.
- Critical UAT findings = 0.

---

## 21. Model Operasional / Business Context

MVP belum menangani transaksi pembayaran.

Namun entity Booking dipersiapkan agar nanti dapat dikembangkan menjadi:

Booking
↓
Quotation
↓
Invoice
↓
Payment
↓
Receipt

Untuk Kids Center:

Program
↓
Package
↓
Enrollment
↓
Invoice
↓
Payment

---

## 22. Lampiran

Status per item (✅ tersedia nyata, ⚠️ belum ada file terpisah):

- Database ERD — ⚠️ belum ada diagram visual terpisah; struktur lengkap sudah tertulis di §13 dan sumber aslinya di `supabase/migrations/0001_init.sql`, `0002_booking_rpc.sql`, `0004_user_management.sql`.
- UI wireframe — ⚠️ belum ada mockup visual; deskripsi struktur UI aktual sudah tertulis di §10 (rujuk kode di `src/app/(app)/` untuk tampilan sesungguhnya).
- Design System — ⚠️ belum ada dokumen terpisah; token warna/style ada di `src/app/globals.css` dan komponen di `src/components/ui/` (shadcn/ui).
- Supabase migration — ✅ `supabase/migrations/` (4 file, urut 0001–0004).
- RLS specification — ✅ tertulis sebagai policy SQL langsung di setiap migration; ringkasan matriks akses ada di §14.
- UAT test cases — ✅ `docs/stage-5-p0-improve-plan.md` (checklist UAT mobile) dan `docs/stage-5-testing-plan.md`.
- Deployment guide — ✅ `README.md` bagian Deployment.
- Environment setup — ✅ `.env.example`, `README.md`.
- Seed data — ⚠️ belum ada file seed terpisah; data awal (business hours 7 hari) di-insert langsung dalam migration.
- Future Kids Center architecture — ✅ sudah di §17 dokumen ini.
- Laporan implementasi tiap stage — ✅ `docs/stage-0-foundation.md` s.d. `docs/stage-5-hardening.md`, plus `docs/stage-5-testing-plan.md`, `docs/stage-5-p0/p1/p2-improve-plan.md`, `docs/stage-5-user-management-plan.md`, dan ringkasan di `docs/laporan-improvement-lengkap.md`.

---

Dokumen ini merupakan living document dan harus diperbarui pada setiap akhir stage development.
