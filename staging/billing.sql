-- Additive billing contract. Apply after staging/sync.sql on the verified copy.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM staging_control.identity WHERE singleton AND sanitized
   AND instance_id::text=current_setting('prtrack.staging_id',true)
   AND database_oid=(SELECT oid FROM pg_database WHERE datname=current_database()))
 THEN RAISE EXCEPTION 'Verified sanitized staging copy required'; END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.si_billing_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.si_billing_config(singleton) VALUES(true) ON CONFLICT DO NOTHING;
-- Cakupan pilot: NULL = semua perusahaan; berisi id = hanya assignment perusahaan tersebut.
ALTER TABLE public.si_billing_config ADD COLUMN IF NOT EXISTS company_ids uuid[];
-- SECURITY DEFINER: role integrasi terbatas cukup memanggil fungsi ini tanpa SELECT ke tabel master.
CREATE OR REPLACE FUNCTION public.si_billing_applies(aid uuid) RETURNS boolean LANGUAGE sql STABLE
 SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT coalesce((SELECT c.enabled AND (c.company_ids IS NULL OR p.company_id = ANY(c.company_ids))
   FROM public.si_billing_config c
   CROSS JOIN public.property_assignments a
   JOIN public.units u ON u.id = a.unit_id
   JOIN public.clusters k ON k.id = u.cluster_id
   JOIN public.projects p ON p.id = k.project_id
   WHERE c.singleton AND a.id = aid), false)
$$;
CREATE TABLE IF NOT EXISTS public.si_schedules (
 id uuid PRIMARY KEY, assignment_id uuid NOT NULL REFERENCES public.property_assignments(id),
 no_urut integer NOT NULL, tanggal date NOT NULL, jumlah numeric(18,2) NOT NULL CHECK(jumlah>0),
 jenis varchar(20) NOT NULL CHECK(jenis IN ('booking_fee','uang_muka','angsuran','pencairan_kpr')),
 keterangan varchar(100), aktif boolean NOT NULL, realisasi numeric(18,2) NOT NULL DEFAULT 0 CHECK(realisasi>=0),
 versi bigint NOT NULL, payload_hash text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS si_schedules_assignment_idx ON public.si_schedules(assignment_id);
ALTER TABLE public.property_assignments ADD COLUMN IF NOT EXISTS si_contract_total numeric(18,2), ADD COLUMN IF NOT EXISTS si_contract_version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.property_assignments DROP CONSTRAINT IF EXISTS property_assignments_check;
ALTER TABLE public.property_assignments ADD CONSTRAINT property_assignments_check CHECK(total_dibayar>=0 AND total_dibayar<=coalesce(si_contract_total,harga_total));
CREATE TABLE IF NOT EXISTS public.si_sync_inbox (
 id uuid PRIMARY KEY, fingerprint text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_history
 ADD COLUMN IF NOT EXISTS si_jadwal_id uuid REFERENCES public.si_schedules(id),
 ADD COLUMN IF NOT EXISTS status_si varchar(20) NOT NULL DEFAULT 'menunggu',
 ADD COLUMN IF NOT EXISTS alasan_si text,
 ADD COLUMN IF NOT EXISTS jurnal_si varchar(60),
 ADD COLUMN IF NOT EXISTS versi_si bigint NOT NULL DEFAULT 0;
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS si_request_hash text;
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS si_result_hash text;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.payment_history'::regclass AND conname='payment_history_si_jadwal_id_fkey') THEN
  ALTER TABLE public.payment_history ADD CONSTRAINT payment_history_si_jadwal_id_fkey FOREIGN KEY(si_jadwal_id) REFERENCES public.si_schedules(id);
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS payment_si_jadwal_idx ON public.payment_history(si_jadwal_id);
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
  IF NEW.tanggal_bayar IS NULL OR NEW.bukti_pembayaran IS NULL OR btrim(NEW.bukti_pembayaran::text) IN ('','[]','null')
    OR NEW.rekening_tujuan IS NULL OR btrim(NEW.rekening_tujuan)='' THEN
   RAISE EXCEPTION 'Tanggal aktual, bukti, dan rekening tujuan wajib diisi' USING ERRCODE='23514'; END IF;
  NEW.jenis:=bill.jenis; NEW.status_verifikasi:='menunggu'; NEW.status_si:='menunggu';
  NEW.alasan_si:='Menunggu verifikasi Keuangan SI.';
  NEW.is_auto_inject:=false; NEW.dikunci_si:=false; NEW.versi_si:=0;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS si_guard_payment ON public.payment_history;
CREATE TRIGGER si_guard_payment BEFORE INSERT OR UPDATE OR DELETE ON public.payment_history
 FOR EACH ROW EXECUTE FUNCTION public.si_guard_payment();
REVOKE ALL ON public.si_sync_inbox, public.si_billing_config FROM PUBLIC;

-- Existing customer totals keep their shape, but linked submissions count only after SI posts them.
CREATE OR REPLACE FUNCTION public.update_total_dibayar() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aid uuid;
BEGIN
 aid:=CASE WHEN TG_OP='DELETE' THEN OLD.assignment_id ELSE NEW.assignment_id END;
 UPDATE public.property_assignments SET total_dibayar=(SELECT coalesce(sum(jumlah_bayar),0) FROM public.payment_history
   WHERE assignment_id=aid AND ((si_jadwal_id IS NULL AND (NOT coalesce(is_auto_inject,false) OR NOT EXISTS(SELECT 1 FROM public.property_assignments WHERE id=aid AND si_contract_total IS NOT NULL))) OR (si_jadwal_id IS NOT NULL AND status_si='dijurnal'))) WHERE id=aid;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND OLD.assignment_id<>NEW.assignment_id THEN
  UPDATE public.property_assignments SET total_dibayar=(SELECT coalesce(sum(jumlah_bayar),0) FROM public.payment_history
   WHERE assignment_id=OLD.assignment_id AND ((si_jadwal_id IS NULL AND (NOT coalesce(is_auto_inject,false) OR NOT EXISTS(SELECT 1 FROM public.property_assignments WHERE id=OLD.assignment_id AND si_contract_total IS NOT NULL))) OR (si_jadwal_id IS NOT NULL AND status_si='dijurnal'))) WHERE id=OLD.assignment_id;
 END IF;
 RETURN NEW;
END $$;
