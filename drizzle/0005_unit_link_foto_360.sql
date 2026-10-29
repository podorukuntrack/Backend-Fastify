-- 0005_unit_link_foto_360.sql
--
-- Link foto 360 milik unit, bukan milik garansi/retensi.
--
-- LATAR
-- Konsep baru dari klien: foto 360 boleh diisi kapan saja, termasuk saat rumah
-- masih dibangun. Sebelumnya link hanya bisa disimpan di retentions.link_foto_360,
-- yang baru ada setelah serah terima.
--
-- CATATAN DESAIN
-- - Hanya menambah kolom nullable. Tidak ada kolom yang diubah atau dihapus,
--   jadi aplikasi mobile dan pembaca lama tidak terpengaruh.
-- - retentions.link_foto_360 dibiarkan apa adanya (tidak diubah, tidak dihapus).
-- - Backfill menyalin link retensi yang sudah ada ke unit, hanya bila unit belum
--   punya link. Bila satu unit punya lebih dari satu retensi, diambil yang terbaru.
-- - Kolom ini tidak masuk payload sync PRSI (payload unit memakai daftar kolom tetap).
--
-- WAJIB dijalankan SEBELUM backend yang membaca u.link_foto_360 di-deploy.
-- Aman dijalankan berulang.

ALTER TABLE public.units ADD COLUMN IF NOT EXISTS link_foto_360 text;

UPDATE public.units u
   SET link_foto_360 = r.link_foto_360
  FROM (
        SELECT DISTINCT ON (unit_id) unit_id, link_foto_360
          FROM public.retentions
         WHERE NULLIF(btrim(link_foto_360), '') IS NOT NULL
         ORDER BY unit_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
       ) r
 WHERE u.id = r.unit_id
   AND u.link_foto_360 IS NULL;
