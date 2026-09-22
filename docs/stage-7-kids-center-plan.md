# Stage 7 — Kids Center Foundation: Plan Implementasi

**Status:** 📋 **Rencana (belum dieksekusi)** — dokumen ini adalah kerangka plan, bukan laporan implementasi. Ditulis mengikuti pola dokumen `stage-5-*-plan.md` (context → asumsi → cakupan → skema → rencana aksi → open questions), supaya siap diterjemahkan langsung ke development begitu asumsi dikonfirmasi manajemen.

**Prasyarat:** MVP (Stage 0–5) sudah selesai dan stabil di production. Stage 7 **tidak mengubah** scheduling engine yang sudah ada (`areas`, `schedules`, exclusion constraint anti-bentrok) — sesuai janji PRD §17: "scheduling engine MVP tidak perlu diganti." Kids Center dibangun **di atas** engine ini, bukan menggantinya.

---

## 1. Kenapa Stage 7, dan Kenapa Belum Sekarang

PRD §3 (Non-Goals MVP) sudah eksplisit menunda: membership, enrollment anak, attendance, instructor management, class package, parent portal. Ini benar untuk MVP karena kebutuhan operasional paling mendesak (cegah double booking, lihat availability, catat booking eksternal) sudah lebih genting daripada fitur Kids Center.

Stage 7 relevan begitu Arayya siap **beroperasi sebagai kids center/activity hub berulang** (anak-anak ikut kelas rutin mingguan), bukan sekadar penyewaan area sekali jalan. Ini beda model dari Booking (sekali pakai) — perlu entity baru: anak, wali, kelas berulang, pendaftaran, kehadiran.

## 2. Asumsi yang Digunakan (perlu dikonfirmasi manajemen)

Karena requirement detail belum ada dari manajemen, plan ini memakai asumsi berikut. Setiap asumsi didesain supaya **murah untuk diubah** kalau ternyata salah — tapi tetap perlu dikonfirmasi sebelum development dimulai.

| # | Area | Asumsi | Alasan | Risiko jika salah |
|---|---|---|---|---|
| A1 | Guardian login | Guardian **tidak** punya akun login sendiri di Stage 7 — dikelola sepenuhnya oleh Admin/Staff seperti Organizer. Parent portal ditunda ke Stage 8. | Konsisten dengan pola Organizer (dikelola internal), dan portal butuh auth terpisah (public sign-up) yang belum dirancang. | Kecil — menambah portal read-only nanti tidak mengubah skema `guardians`/`children`. |
| A2 | Relasi Guardian–Child | Satu Child punya tepat satu Guardian utama (FK langsung), bukan many-to-many. | Kasus umum di Arayya (1 wali daftar 1 anak); menyederhanakan form pendaftaran. | Sedang — kalau butuh 2 wali per anak (co-parenting), perlu tabel junction `child_guardians` tambahan. Didesain sebagai migrasi non-breaking (tabel baru, tidak mengubah `children`). |
| A3 | Class = recurring pattern | Class punya pola jadwal berulang tetap (mis. "Setiap Senin & Rabu 10:00–11:00") yang di-generate jadi baris `schedules` per minggu ke depan (rolling window, mis. 4 minggu ke depan), bukan digenerate manual satu-satu oleh Admin. | Mengurangi kerja manual Admin bikin jadwal tiap minggu; tetap pakai engine `schedules` yang sudah ada. | Sedang — perlu job/cron generator. Kalau pola berubah di tengah jalan (ganti hari), sesi yang sudah ter-generate untuk minggu depan perlu strategi regenerasi (dijelaskan di §5.3). |
| A4 | Attendance | Dicatat manual oleh Staff/Instructor per sesi kelas (bukan otomatis dari QR/absensi elektronik). | MVP kids center — hardware/QR di luar scope, dan tim kecil masih bisa cek manual. | Kecil — status kehadiran (`present`/`absent`/`late`) cukup fleksibel untuk upgrade ke QR nanti tanpa ubah skema. |
| A5 | Membership | Membership di Stage 7 adalah **flag status sederhana** (`active`/`inactive`, tanpa billing/expiry otomatis) — bukan prasyarat wajib untuk enrollment. Bisa jadi field opsional di Guardian. | Payment gateway ditunda ke Stage 8 (PRD §8 Non-Goals), jadi membership tanpa pembayaran otomatis nilainya terbatas sampai Stage 8 siap. | Kecil — kalau nanti perlu expiry/tier, tambah kolom, bukan redesign. |
| A6 | Instructor | Instructor adalah master data baru (mirip pola Organizer: CRUD sederhana + status aktif/nonaktif), **bukan** user dengan login aplikasi (tidak perlu portal instructor di Stage 7). | Instructor Arayya kemungkinan staf internal yang sudah punya akun, atau freelance yang tidak perlu akses sistem. | Kecil — kalau instructor butuh login untuk lihat jadwal sendiri, itu penambahan role baru, bukan perubahan skema. |
| A7 | Class ↔ Area | Satu Class terikat ke satu Area tetap (bukan area fleksibel tiap sesi), supaya reuse exclusion constraint `schedules` apa adanya. | Menghindari kompleksitas re-alokasi area otomatis. | Kecil — Admin tetap bisa override area per sesi individual lewat `schedules` biasa kalau perlu (sama seperti Blocked Time sekarang). |
| A8 | Kapasitas Class vs Enrollment | Enrollment divalidasi terhadap `class.capacity`, terpisah dari `area.capacity` (class capacity bisa lebih kecil dari kapasitas area, mis. rasio instruktur:anak). | Kids center biasanya membatasi jumlah anak per kelas lebih ketat dari kapasitas ruangan. | Kecil — field independen, tidak saling mengunci. |
| A9 | Harga/Fee | Field `price` di Class hanya **disimpan sebagai referensi/display** (bukan trigger invoice/payment nyata) — payment flow penuh ada di Stage 8. | Sesuai PRD §21: Program → Package → Enrollment → Invoice → Payment ditunda. | Kecil — field nominal saja, tidak ada state machine payment sampai Stage 8. |

> **Tindakan yang diperlukan dari manajemen:** review tabel di atas, terutama A2 (satu vs dua wali), A5 (apakah membership perlu expiry dari awal), dan A9 (apakah harga perlu tampil ke customer di Stage 7 atau baru Stage 8). Kalau tidak ada koreksi dalam waktu wajar, plan ini dieksekusi dengan asumsi di atas (sesuai instruksi: "jangan menunggu semua detail harus dari management tentukan terlebih dahulu").

## 3. Cakupan Fitur Stage 7

1. **Guardian (Wali)** — master data: nama, telepon, email, alamat, catatan, status aktif.
2. **Child (Anak)** — master data: nama, tanggal lahir, jenis kelamin, guardian_id, catatan medis/alergi, status aktif.
3. **Instructor** — master data: nama, telepon, email, spesialisasi, status aktif.
4. **Program** — kategori besar kegiatan rutin (mis. "Kelas Melukis Anak", "Kids Gym Program") — nama, deskripsi, rentang usia target, status.
5. **Class** — instance program yang punya jadwal berulang: program_id, nama, instructor_id, area_id, pola jadwal (hari + jam mulai/selesai), kapasitas, harga (referensi), status.
6. **Enrollment** — pendaftaran anak ke class: child_id, class_id, tanggal daftar, status (`active`/`paused`/`cancelled`), tanggal mulai/berhenti.
7. **Class Session** — instance tanggal spesifik dari Class, tergenerate otomatis (rolling window) sebagai baris di `schedules` (type baru `class_session`) + tabel pendamping `class_sessions` untuk metadata (class_id, generated_from_class_at).
8. **Attendance** — presensi per anak per sesi: session_id (→ class_sessions/schedules), child_id, status (`present`/`absent`/`late`), notes, recorded_by, recorded_at.

**Non-Goals Stage 7** (tetap ditunda ke Stage 8, sesuai PRD §3 & §16):
- Payment/invoice sungguhan.
- Parent portal (self-service login untuk wali).
- Public self-enrollment.
- Class package/paket multi-kelas dengan harga bundel.
- Notifikasi otomatis (WA/email reminder).

## 4. Skema Database (Rencana Migrasi Baru)

Mengikuti pola migration existing (`supabase/migrations/000X_*.sql`), rencana `0006_kids_center_foundation.sql`:

### guardians
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text, not null | |
| phone | text, nullable | |
| email | text, nullable | |
| address | text, nullable | |
| notes | text, nullable | |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### children
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| guardian_id | uuid, FK → guardians, not null | (lihat A2 — bisa berubah jadi junction table) |
| name | text, not null | |
| date_of_birth | date, nullable | |
| gender | text, nullable | |
| medical_notes | text, nullable | alergi, kondisi khusus |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### instructors
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text, not null | |
| phone | text, nullable | |
| email | text, nullable | |
| specialization | text, nullable | |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### programs
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text, not null | |
| description | text, nullable | |
| min_age, max_age | integer, nullable | dalam tahun |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### classes
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| program_id | uuid, FK → programs, not null | |
| name | text, not null | |
| instructor_id | uuid, FK → instructors, nullable | |
| area_id | uuid, FK → areas, not null | (A7) |
| recurrence_days | int[] | array `day_of_week` (0–6), bisa lebih dari satu hari |
| start_time, end_time | time, not null | jam per sesi |
| capacity | integer, not null | CHECK > 0 (A8) |
| price | numeric, nullable | referensi saja (A9) |
| status | text | `active` \| `inactive`, default `active` |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |

### enrollments
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| child_id | uuid, FK → children, not null | |
| class_id | uuid, FK → classes, not null | |
| enrolled_at | date, not null, default today | |
| start_date | date, not null | |
| end_date | date, nullable | null = masih aktif |
| status | text | `active` \| `paused` \| `cancelled`, default `active` |
| notes | text, nullable | |
| created_at, updated_at | timestamptz | |
| created_by, updated_by | uuid, FK → profiles | |
| | | UNIQUE (child_id, class_id) WHERE status = 'active' — cegah daftar dobel ke class yang sama |

### class_sessions
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| class_id | uuid, FK → classes, not null | |
| schedule_id | uuid, FK → schedules, not null, unique | link ke baris schedules yang tergenerate (A3) |
| session_date | date, not null | |
| status | text | `scheduled` \| `completed` \| `cancelled`, mirror dari schedules.status |

> `schedules.type` ditambah value baru `class_session` (CHECK constraint diupdate). Exclusion constraint anti-bentrok existing otomatis berlaku ke sesi kelas juga — tidak perlu constraint baru.

### attendance
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| class_session_id | uuid, FK → class_sessions, not null | |
| child_id | uuid, FK → children, not null | |
| status | text | `present` \| `absent` \| `late`, nullable sampai dicatat |
| notes | text, nullable | |
| recorded_by | uuid, FK → profiles, nullable | |
| recorded_at | timestamptz, nullable | |
| | | UNIQUE (class_session_id, child_id) |

Semua tabel baru: RLS aktif (read untuk Staff+Admin, write CRUD sesuai matriks §6 di bawah), pola sama seperti `areas`/`activities` di `0001_init.sql`.

## 5. User Flow

### 5.1 Setup Awal (Admin)
```
Admin → Master Data → tambah Guardian
                    → tambah Child (pilih Guardian)
                    → tambah Instructor
                    → tambah Program
                    → tambah Class (pilih Program, Instructor, Area,
                      pola hari + jam, kapasitas, harga referensi)
```

### 5.2 Enrollment
```
Staff/Admin → pilih Child → pilih Class yang tersedia
           → cek kapasitas Class (bukan kapasitas Area)
           → set tanggal mulai
           → Save → Enrollment aktif
```

### 5.3 Generate Class Sessions (job/cron atau tombol manual "Generate Jadwal")
```
Untuk setiap Class aktif:
  Hitung tanggal sesi berikutnya dalam rolling window (mis. 4 minggu ke depan)
  berdasarkan recurrence_days + start_time/end_time
  ↓
  Untuk tiap tanggal yang belum punya class_session:
    Insert ke schedules (type='class_session', area_id, start_at, end_at)
    → exclusion constraint tetap berlaku (kalau area kebentrok, sesi itu di-skip + log warning,
      bukan crash seluruh batch)
    Insert ke class_sessions (link ke schedule_id)
```
**Catatan strategi perubahan pola (terkait A3):** kalau Admin ubah `recurrence_days`/jam pada Class yang sudah punya sesi ter-generate untuk minggu depan, sesi lama (yang belum lewat, status `scheduled`) **tidak otomatis dihapus** — Admin perlu membatalkan manual lewat halaman Jadwal seperti Blocked Time biasa, lalu re-generate akan membuat sesi baru sesuai pola terbaru. Ini konsisten dengan prinsip Historical Integrity PRD §8.3 (tidak menghapus data yang sudah ada begitu saja).

### 5.4 Attendance
```
Staff/Instructor → pilih Class Session (dari Jadwal hari ini, filter type=class_session)
                 → lihat daftar Child yang ter-enroll aktif di class itu
                 → tandai present/absent/late per anak
                 → Save
```

## 6. Role & Permission (perluasan matriks PRD §14)

| Feature | Admin | Staff |
|---|---:|---:|
| Guardian/Child CRUD | ✅ | Read + Create (data operasional harian, sama pola Booking) |
| Instructor CRUD | ✅ | Read |
| Program/Class CRUD | ✅ | Read |
| Enrollment | ✅ | ✅ (sama pola Booking — Staff bisa daftarkan anak) |
| Generate Class Sessions | ✅ | ❌ (operasi sistem, admin-only, mirip Business Hours) |
| Attendance | ✅ | ✅ |

## 7. UI (rencana halaman baru)

- `/children` — tabel Child (Nama, Usia, Guardian, Status) + search + create/edit dialog (pola sama seperti `/areas`).
- `/guardians` — tabel Guardian, sama pola.
- `/instructors` — tabel Instructor, sama pola.
- `/programs` — tabel Program.
- `/classes` — tabel Class (Nama, Program, Instructor, Area, Jadwal, Kapasitas Terisi/Total, Status) + tombol "Generate Jadwal" (Admin only) di halaman detail.
- `/classes/[id]/enrollments` — daftar anak ter-enroll di class tsb + tombol tambah enrollment.
- `/schedule` (existing) — tab Daftar Jadwal menampilkan baris `class_session` dengan label berbeda dari `internal_activity`/`external_booking`/`blocked`; klik baris `class_session` → buka halaman/dialog Attendance untuk sesi itu.
- Menu "Lainnya" (mobile) & sidebar (desktop): tambah section "Kids Center" berisi link Children, Guardians, Instructors, Programs, Classes — dipisah dari section master data existing (Area/Activity/Organizer) supaya tidak membingungkan operasional harian booking biasa.

## 8. Rencana Eksekusi Bertahap

| Sub-stage | Isi | Output |
|---|---|---|
| 7.1 | Migrasi skema (`guardians`, `children`, `instructors`, `programs`) + CRUD UI (pola sama Area/Activity) | Admin bisa input data master Kids Center |
| 7.2 | `classes` + `enrollments` + validasi kapasitas | Admin/Staff bisa buat Class dan daftarkan Child |
| 7.3 | Generator `class_sessions` (rolling window) + integrasi tampilan di halaman Jadwal | Sesi kelas otomatis muncul di kalender existing |
| 7.4 | `attendance` UI + rekap kehadiran per Child/Class | Staff bisa catat kehadiran harian |
| 7.5 | Testing (unit: kapasitas & generator; e2e: enroll → generate → attendance) + UAT | Kids Center foundation siap dipakai operasional |

## 9. Open Questions untuk Manajemen

1. Apakah satu Child bisa punya 2 wali (co-parenting/kakek-nenek juga perlu dicatat)? → menentukan A2.
2. Apakah membership perlu punya masa berlaku (expiry) sejak Stage 7, atau cukup status aktif/nonaktif dulu? → menentukan A5.
3. Apakah harga Class perlu tampil ke customer di Stage 7 (sekadar informasi), atau baru relevan setelah Payment (Stage 8) siap? → menentukan A9.
4. Siapa yang bertanggung jawab menekan "Generate Jadwal" tiap periode — otomatis via cron Supabase, atau tombol manual yang ditekan Admin? (Default plan: mulai dari tombol manual dulu di 7.3, upgrade ke cron kalau operasional terbukti stabil.)

---

Dokumen ini adalah living plan — update begitu asumsi terkonfirmasi atau berubah selama eksekusi Stage 7.
