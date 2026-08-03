-- 0002_fix_reminder_kpr_dates.sql
--
-- MASALAH
-- insertAssignment() memanggil JSON.stringify() dua kali pada reminder_kpr_dates,
-- sehingga nilainya tersimpan sebagai JSON *string* ("[1,2,3]") dan bukan JSON array
-- ([1,2,3]). updateAssignment() menyimpannya dengan benar, jadi datanya campur.
--
-- DAMPAK
-- kpr-reminder.cron.js menyaring dengan Array.isArray(row.reminder_kpr_dates).
-- Untuk baris bertipe string, hasilnya [] sehingga pengingat bulanan tidak pernah
-- terkirim ke customer aplikasi mobile.
--
-- URUTAN
-- 1. Deploy perbaikan kode (assignment.repository.js) TERLEBIH DAHULU,
--    agar tidak ada baris string baru yang dibuat setelah migrasi dijalankan.
-- 2. Baru jalankan file ini.
--
-- Aman dijalankan berulang (idempoten): baris yang sudah bertipe array dilewati.

BEGIN;

-- Sebelum: lihat sebarannya
--   SELECT jsonb_typeof(reminder_kpr_dates), count(*)
--   FROM property_assignments GROUP BY 1;

UPDATE property_assignments
SET    reminder_kpr_dates = (reminder_kpr_dates #>> '{}')::jsonb
WHERE  jsonb_typeof(reminder_kpr_dates) = 'string';

-- Verifikasi: query ini harus mengembalikan 0 baris
--   SELECT count(*) FROM property_assignments
--   WHERE jsonb_typeof(reminder_kpr_dates) <> 'array';

COMMIT;
