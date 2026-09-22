# Stage 8 — Commercial Expansion: Plan Implementasi

**Status:** 📋 **Rencana (belum dieksekusi)** — bergantung pada Stage 7 (Kids Center Foundation) selesai lebih dulu, karena Payment & Package di stage ini melekat pada Enrollment/Class dari Stage 7. Dokumen ini level lebih tinggi/kurang detail dibanding Stage 7 karena masih jauh di depan dan asumsinya lebih sensitif terhadap keputusan bisnis (harga, metode pembayaran, kebijakan refund) yang belum bisa diputuskan sepihak.

---

## 1. Kenapa Ditunda Sampai Setelah Stage 7

PRD §21 sudah menggambarkan alur target:

```
Booking → Quotation → Invoice → Payment → Receipt          (jalur Booking/eksternal)
Program → Package → Enrollment → Invoice → Payment          (jalur Kids Center)
```

Kedua jalur butuh entity **Enrollment** (Stage 7) dan **Booking** (sudah ada di MVP) sebagai basis sebelum Invoice/Payment bisa dibangun. Payment gateway tanpa entity transaksi yang jelas di baliknya berisiko jadi over-engineering — sesuai prinsip "jangan over-engineering" di instruksi awal proyek.

## 2. Asumsi Kunci (lebih perlu konfirmasi eksplisit dari Stage 7, karena menyentuh uang)

| # | Area | Asumsi | Kenapa perlu konfirmasi eksplisit |
|---|---|---|---|
| B1 | Payment gateway | Integrasi payment gateway Indonesia (mis. Midtrans/Xendit) sebagai pilihan default — **belum ditentukan vendor**. | Pemilihan vendor menyangkut biaya transaksi & kontrak bisnis, bukan keputusan teknis semata. |
| B2 | Metode pembayaran manual | Selain gateway, tetap sediakan opsi "Tandai Lunas Manual" (transfer/cash dicatat Admin) — tidak semua transaksi kids center perlu online payment. | Realistis untuk transaksi tunai di lokasi, terutama booking eksternal walk-in. |
| B3 | Refund/Cancellation policy | Belum ada kebijakan refund yang terdefinisi (persentase, tenggat waktu). Sistem akan menyediakan status `refunded` di Payment sebagai placeholder, tapi kalkulasi otomatis besaran refund **ditunda** sampai kebijakan bisnis ditetapkan. | Ini murni keputusan bisnis, bukan teknis. |
| B4 | Public booking / customer portal | Self-service booking oleh customer langsung (tanpa staff perantara) baru masuk di akhir Stage 8, setelah payment flow stabil di sisi internal dulu. | Public-facing form yang menyentuh uang butuh testing lebih matang; tidak ingin merilis payment + public access sekaligus. |
| B5 | Notifikasi | WA/email notifikasi (reminder kelas, invoice, konfirmasi booking) pakai penyedia pihak ketiga (mis. WA Business API/Fonnte, atau email transactional seperti Resend) — vendor belum ditentukan. | Sama seperti B1, ini pilihan vendor + biaya berlangganan yang perlu keputusan bisnis. |

## 3. Cakupan Fitur (garis besar, detail menyusul setelah Stage 7 selesai dan asumsi B1–B5 terkonfirmasi)

1. **Package** — bundel Class/Program dengan harga khusus (mis. "Paket 4x Pertemuan").
2. **Invoice** — dibuat dari Booking (eksternal) atau Enrollment/Package (kids center), berisi rincian biaya, status (`draft`/`sent`/`paid`/`overdue`/`cancelled`).
3. **Payment** — pencatatan pembayaran terhadap Invoice, baik manual maupun via gateway; status (`pending`/`paid`/`failed`/`refunded`).
4. **Receipt** — bukti pembayaran (PDF/tampilan), digenerate otomatis setelah Payment berstatus `paid`.
5. **Customer/Parent Portal** — akses terbatas untuk Guardian/Customer melihat jadwal anak, invoice, dan riwayat pembayaran sendiri (read-only di awal, tanpa self-booking dulu).
6. **Public Self-Booking** — form booking publik tanpa login staff, dengan validasi availability yang sama seperti flow internal (reuse `availability` engine, tidak dibuat ulang).
7. **Notifikasi otomatis** — reminder kelas H-1, konfirmasi booking, invoice jatuh tempo.

## 4. Prinsip Desain yang Wajib Dipegang (supaya konsisten dengan MVP)

- **Reuse scheduling/availability engine yang sudah ada** — Invoice/Payment adalah lapisan di atas `bookings`/`enrollments`, bukan pengganti. Tidak ada perubahan pada exclusion constraint atau skema `schedules`.
- **Payment gateway di server-side saja** — mengikuti pola Stage 5 User Management (service role/secret key tidak boleh menyentuh client), webhook dari gateway diverifikasi signature-nya di server action/route handler sebelum mengubah status Invoice/Payment.
- **Historical integrity** — Invoice/Payment tidak pernah hard-delete, hanya berubah status (konsisten PRD §8.3).
- **Public-facing form (Stage 8.6-8.7) baru dibangun setelah internal payment flow (8.1-8.4) terbukti stabil di production** — mengurangi risiko bug pembayaran langsung terekspos ke publik.

## 5. Rencana Eksekusi Bertahap (indikatif, detail skema menyusul)

| Sub-stage | Isi | Prasyarat |
|---|---|---|
| 8.1 | Skema `packages`, `invoices`, `payments` + CRUD Invoice manual (tanpa gateway dulu) | Stage 7 selesai |
| 8.2 | Payment manual ("Tandai Lunas") + Receipt generation | 8.1 |
| 8.3 | Integrasi payment gateway (vendor terpilih dari B1) + webhook handler | 8.2, keputusan bisnis B1 |
| 8.4 | Refund flow (setelah kebijakan B3 ditetapkan) | 8.3, keputusan bisnis B3 |
| 8.5 | Notifikasi otomatis (vendor terpilih dari B5) | 8.2 |
| 8.6 | Parent/Customer portal read-only | 8.2 |
| 8.7 | Public self-booking + self-enrollment | 8.6, terbukti stabil di production |

## 6. Open Questions untuk Manajemen (wajib dijawab sebelum Stage 8 dimulai, beda dengan Stage 7 yang bisa jalan dengan asumsi default)

1. Vendor payment gateway apa yang mau dipakai (atau kombinasi manual + gateway)? → B1.
2. Kebijakan refund seperti apa (persentase berdasarkan H- sebelum kelas/booking)? → B3.
3. Apakah customer portal perlu di awal Stage 8, atau notifikasi WA/email saja sudah cukup untuk fase ini? → prioritas 8.5 vs 8.6.
4. Vendor notifikasi WA/email yang disetujui (ada budget berlangganan)? → B5.

---

Dokumen ini sengaja ditulis lebih ringkas dari Stage 7 karena menyentuh keputusan bisnis (uang, vendor, kebijakan refund) yang tidak bisa diasumsikan sepihak tanpa risiko salah arah — beda dengan Stage 7 yang murni keputusan desain teknis dan bisa diasumsikan dengan aman. Detail skema database akan ditulis begitu Stage 7 selesai dan open questions di atas terjawab.
