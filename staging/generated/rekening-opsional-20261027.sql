-- Patch prod 2026-10-27: rekening tujuan tidak lagi wajib pada pengajuan tagihan SI.
-- Hanya mengganti fungsi trigger si_guard_payment. Kolom payment_history.rekening_tujuan
-- tetap ada (nullable); kontrak sync dan hash tidak berubah. Rollback: jalankan ulang
-- fungsi dari commit sebelumnya (staging/billing.sql di fc16fe3).
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF current_setting('prtrack.target_database',true) IS DISTINCT FROM current_database()
   OR current_setting('prtrack.sync_migration_approved',true) IS DISTINCT FROM 'rekening-opsional-20261027'
 THEN RAISE EXCEPTION 'Explicit target database and reviewed patch approval required'; END IF;
 IF to_regprocedure('public.si_guard_payment()') IS NULL THEN RAISE EXCEPTION 'si_guard_payment belum ada'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.si_guard_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bill public.si_schedules;
BEGIN
 IF current_setting('prtrack.finance_writer',true)='result' THEN
  IF TG_OP<>'UPDATE' OR (to_jsonb(NEW)-ARRAY['status_si','alasan_si','jurnal_si','versi_si','dikunci_si','sync_version','updated_at','si_result_hash'])
    IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status_si','alasan_si','jurnal_si','versi_si','dikunci_si','sync_version','updated_at','si_result_hash'])
  THEN RAISE EXCEPTION 'SI result cannot change submitted payment' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP<>'INSERT' AND (OLD.si_jadwal_id IS NOT NULL OR OLD.dikunci_si) THEN
  RAISE EXCEPTION 'Pembayaran terikat tagihan; koreksi melalui Keuangan SI' USING ERRCODE='23514';
 END IF;
 IF TG_OP='INSERT' AND (public.si_billing_applies(NEW.assignment_id) OR NEW.si_jadwal_id IS NOT NULL) THEN
  IF NEW.si_jadwal_id IS NULL THEN RAISE EXCEPTION 'Pilih tagihan SI' USING ERRCODE='23514'; END IF;
  SELECT * INTO bill FROM public.si_schedules WHERE id=NEW.si_jadwal_id FOR UPDATE;
  IF NOT FOUND OR NOT bill.aktif OR bill.assignment_id<>NEW.assignment_id OR bill.realisasi>=bill.jumlah THEN
   RAISE EXCEPTION 'Tagihan tidak aktif, lunas, atau bukan milik penjualan' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM public.payment_history WHERE si_jadwal_id=bill.id AND status_si IN ('menunggu','dijurnal','perlu_ditinjau')) THEN
   RAISE EXCEPTION 'Tagihan sudah memiliki pembayaran yang sedang diproses' USING ERRCODE='23514'; END IF;
  IF NEW.jumlah_bayar<>bill.jumlah-bill.realisasi THEN
   RAISE EXCEPTION 'Nominal wajib sama dengan sisa tagihan SI' USING ERRCODE='23514'; END IF;
  -- Rekening tujuan tidak lagi diisi di Track; SI memakai akun kas default bila kosong.
  IF NEW.tanggal_bayar IS NULL OR NEW.bukti_pembayaran IS NULL OR btrim(NEW.bukti_pembayaran::text) IN ('','[]','null') THEN
   RAISE EXCEPTION 'Tanggal aktual dan bukti wajib diisi' USING ERRCODE='23514'; END IF;
  NEW.jenis:=bill.jenis; NEW.status_verifikasi:='menunggu'; NEW.status_si:='menunggu';
  NEW.alasan_si:='Menunggu verifikasi Keuangan SI.';
  NEW.is_auto_inject:=false; NEW.dikunci_si:=false; NEW.versi_si:=0;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
COMMIT;
