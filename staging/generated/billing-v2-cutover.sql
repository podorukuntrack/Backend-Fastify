BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $$ BEGIN
 IF current_setting('prtrack.target_database',true) IS DISTINCT FROM current_database()
   OR current_setting('prtrack.sync_migration_approved',true) IS DISTINCT FROM 'billing-v2-20261019'
 THEN RAISE EXCEPTION 'Explicit target database and reviewed cutover approval required'; END IF;
 IF (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('companies','projects','clusters','units','users','property_assignments','payment_history'))<>7
 THEN RAISE EXCEPTION 'Track schema preflight failed'; END IF;
END $$;

ALTER TABLE payment_history
 ADD COLUMN IF NOT EXISTS jenis varchar(20),
 ADD COLUMN IF NOT EXISTS status_verifikasi varchar(20) NOT NULL DEFAULT 'menunggu',
 ADD COLUMN IF NOT EXISTS rekening_tujuan varchar(30),
 ADD COLUMN IF NOT EXISTS diverifikasi_oleh varchar(150),
 ADD COLUMN IF NOT EXISTS diverifikasi_pada timestamptz,
 ADD COLUMN IF NOT EXISTS dikunci_si boolean NOT NULL DEFAULT false;
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS si_jadwal_id uuid;
-- Keputusan pemilik 21 Oktober 2026: pembayaran yang sudah tercatat di Track sebelum
-- cutover dianggap sah (produksi tidak punya kolom verifikasi/jenis). Jenis lama:
-- auto-injeksi KPR -> pencairan_kpr, lainnya -> uang_muka. Dijalankan sekali; penanda
-- mencegah pembayaran yang masuk sesudah cutover ikut disahkan saat skrip diulang.
-- Status yang sudah ditetapkan (mis. ditolak) dan nilai jenis yang ada tidak diubah.
CREATE TABLE IF NOT EXISTS public.si_legacy_backfill (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 applied_at timestamptz NOT NULL DEFAULT now(), rows_updated integer NOT NULL
);
REVOKE ALL ON public.si_legacy_backfill FROM PUBLIC;
DO $$ DECLARE n integer; BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.si_legacy_backfill) THEN
  UPDATE public.payment_history SET
    jenis = coalesce(jenis, CASE WHEN coalesce(is_auto_inject, false) THEN 'pencairan_kpr' ELSE 'uang_muka' END),
    status_verifikasi = CASE WHEN status_verifikasi = 'menunggu' AND diverifikasi_pada IS NULL THEN 'terverifikasi' ELSE status_verifikasi END,
    diverifikasi_oleh = CASE WHEN status_verifikasi = 'menunggu' AND diverifikasi_pada IS NULL THEN 'Sistem lama (sebelum cutover billing SI)' ELSE diverifikasi_oleh END,
    diverifikasi_pada = CASE WHEN status_verifikasi = 'menunggu' AND diverifikasi_pada IS NULL THEN now() ELSE diverifikasi_pada END
  WHERE si_jadwal_id IS NULL AND (jenis IS NULL OR (status_verifikasi = 'menunggu' AND diverifikasi_pada IS NULL));
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.si_legacy_backfill (rows_updated) VALUES (n);
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.sync_outbox (
 seq bigserial PRIMARY KEY, entity varchar(30) NOT NULL, entity_id uuid NOT NULL,
 op char(1) NOT NULL CHECK (op IN ('I','U','D')), row_version bigint NOT NULL,
 payload jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
-- Refuse legacy incompatible outboxes; never silently discard event history.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sync_outbox' AND column_name='op')
 THEN RAISE EXCEPTION 'Legacy outbox: restore a fresh copy before migration'; END IF;
END $$;
CREATE SEQUENCE IF NOT EXISTS public.sync_row_version;
SELECT setval('public.sync_row_version', greatest((SELECT last_value FROM public.sync_row_version),
 coalesce((SELECT max(row_version) FROM public.sync_outbox),0)) + 1, false);
CREATE OR REPLACE FUNCTION public.sync_bump_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.sync_version := nextval('public.sync_row_version'); RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.sync_business_payload(e text, r jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE fields text[]; result jsonb;
BEGIN
 fields := CASE e
 WHEN 'companies' THEN ARRAY['id','nama_pt','kode_pt','alamat']
 WHEN 'projects' THEN ARRAY['id','company_id','nama_proyek','status']
 WHEN 'clusters' THEN ARRAY['id','project_id','nama_cluster']
 WHEN 'units' THEN ARRAY['id','cluster_id','nomor_unit','tipe_rumah','luas_tanah','luas_bangunan','status_pembangunan']
 WHEN 'customers' THEN ARRAY['id','nama','email','nomor_telepon']
 WHEN 'assignments' THEN ARRAY['id','user_id','unit_id','tipe_pembayaran','harga_total','dp','status_kepemilikan','tanggal_pembelian']
 WHEN 'payments' THEN ARRAY['id','assignment_id','jumlah_bayar','tanggal_bayar','catatan','bukti_pembayaran','is_auto_inject','created_at','jenis','status_verifikasi','rekening_tujuan','diverifikasi_oleh','diverifikasi_pada','si_jadwal_id']
 ELSE NULL END;
 IF fields IS NULL THEN RAISE EXCEPTION 'Unknown entity'; END IF;
 SELECT jsonb_object_agg(k, r->k) INTO result FROM unnest(fields) k;
 IF e = 'assignments' THEN result := result || jsonb_build_object('tanggal_pembelian', left(r->>'tanggal_pembelian',10)); END IF;
 IF e = 'payments' THEN result := result || jsonb_build_object('tanggal_bayar', left(r->>'tanggal_bayar',10)); END IF;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.sync_enqueue_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e text := TG_ARGV[0]; old_r jsonb; new_r jsonb; r jsonb; operation char(1); v bigint;
BEGIN
 IF TG_OP <> 'INSERT' THEN old_r := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN new_r := to_jsonb(NEW); END IF;
 IF e='customers' AND coalesce(old_r->>'role','') <> 'customer' AND coalesce(new_r->>'role','') <> 'customer' THEN RETURN NULL; END IF;
 IF TG_OP='DELETE' THEN operation := 'D'; r := old_r; v := nextval('public.sync_row_version');
 ELSIF e='customers' AND old_r->>'role'='customer' AND new_r->>'role'<>'customer' THEN operation := 'D'; r := new_r; v := NEW.sync_version;
 ELSIF TG_OP='INSERT' OR (e='customers' AND coalesce(old_r->>'role','')<>'customer') THEN operation := 'I'; r := new_r; v := NEW.sync_version;
 ELSE operation := 'U'; r := new_r; v := NEW.sync_version; END IF;
 INSERT INTO public.sync_outbox(entity,entity_id,op,row_version,payload)
 VALUES(e,(r->>'id')::uuid,operation,v,CASE WHEN operation='D' THEN NULL ELSE public.sync_business_payload(e,r) END);
 RETURN NULL;
END $$;
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM (VALUES ('companies','companies'),('projects','projects'),('clusters','clusters'),('units','units'),('users','customers'),('property_assignments','assignments'),('payment_history','payments')) m(t,e) LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sync_version bigint NOT NULL DEFAULT 0',r.t);
  EXECUTE format('DROP TRIGGER IF EXISTS sync_bump_version_%I ON public.%I',r.t,r.t);
  EXECUTE format('DROP TRIGGER IF EXISTS sync_enqueue_%I ON public.%I',r.t,r.t);
  EXECUTE format('CREATE TRIGGER sync_bump_version_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sync_bump_version()',r.t,r.t);
  EXECUTE format('CREATE TRIGGER sync_enqueue_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sync_enqueue_event(%L)',r.t,r.t,r.e);
 END LOOP;
END $$;
-- Contract v2: commit-order cursor. Every event records the top-level transaction
-- id of its writer. /sync/v2/events only returns events whose txid is below the
-- reader snapshot xmin, so every event it returns belongs to a finished
-- transaction and every transaction still running gets a txid at or above the
-- watermark. Ordered by (txid, seq), a late commit can never land behind the
-- reader cursor. Additive: v1 readers keep using seq.
ALTER TABLE public.sync_outbox ADD COLUMN IF NOT EXISTS txid xid8;
UPDATE public.sync_outbox SET txid = '0'::xid8 WHERE txid IS NULL; -- pre-v2 rows sort first, by seq
ALTER TABLE public.sync_outbox ALTER COLUMN txid SET DEFAULT pg_current_xact_id();
ALTER TABLE public.sync_outbox ALTER COLUMN txid SET NOT NULL;
CREATE INDEX IF NOT EXISTS sync_outbox_txid_seq_idx ON public.sync_outbox (txid, seq);
CREATE TABLE IF NOT EXISTS public.sync_feed (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 source_id uuid NOT NULL DEFAULT gen_random_uuid(), pruned_txid xid8 NOT NULL DEFAULT '0', pruned_seq bigint NOT NULL DEFAULT 0
);
INSERT INTO public.sync_feed(singleton) VALUES(true) ON CONFLICT DO NOTHING;
-- Retention (contract: events older than 30 days may be removed). Run by the
-- owner role from a scheduled job; the read-only runtime role cannot call it.
CREATE OR REPLACE FUNCTION public.sync_prune_outbox(keep interval DEFAULT interval '30 days') RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE watermark xid8; boundary record; removed bigint;
BEGIN
 PERFORM 1 FROM public.sync_feed WHERE singleton FOR UPDATE;
 watermark:=pg_snapshot_xmin(pg_current_snapshot());
 SELECT o.txid,o.seq INTO boundary FROM public.sync_outbox o
   WHERE o.txid<watermark AND o.created_at<now()-greatest(keep,interval '7 days')
     AND NOT EXISTS(SELECT 1 FROM public.sync_outbox y WHERE y.created_at>=now()-greatest(keep,interval '7 days') AND (y.txid,y.seq)<=(o.txid,o.seq))
   ORDER BY o.txid DESC,o.seq DESC LIMIT 1;
 IF boundary IS NULL THEN RETURN 0; END IF;
 DELETE FROM public.sync_outbox WHERE (txid,seq)<=(boundary.txid,boundary.seq);
 GET DIAGNOSTICS removed=ROW_COUNT;
 UPDATE public.sync_feed SET pruned_txid=boundary.txid,pruned_seq=boundary.seq WHERE singleton;
 RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_prune_outbox(interval) FROM PUBLIC;

-- Shared content checksum contract. Field order is significant; never sort keys.
CREATE OR REPLACE FUNCTION public.sync_content_row_hash(entity text, r jsonb) RETURNS text
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public SET timezone = 'UTC' AS $$
DECLARE fields text[]; k text; v text; serialized text := r->>'id';
BEGIN
 fields := CASE entity
 WHEN 'companies' THEN ARRAY['nama_pt','kode_pt','alamat']
 WHEN 'projects' THEN ARRAY['company_id','nama_proyek','status']
 WHEN 'clusters' THEN ARRAY['project_id','nama_cluster']
 WHEN 'units' THEN ARRAY['cluster_id','nomor_unit','tipe_rumah','luas_tanah','luas_bangunan','status_pembangunan']
 WHEN 'customers' THEN ARRAY['nama','email','nomor_telepon']
 WHEN 'assignments' THEN ARRAY['user_id','unit_id','tipe_pembayaran','harga_total','dp','status_kepemilikan','tanggal_pembelian']
 WHEN 'payments' THEN ARRAY['assignment_id','jumlah_bayar','tanggal_bayar','catatan','bukti_pembayaran','is_auto_inject','created_at','jenis','status_verifikasi','rekening_tujuan','diverifikasi_oleh','diverifikasi_pada','si_jadwal_id']
 ELSE NULL END;
 IF fields IS NULL THEN RAISE EXCEPTION 'Unknown entity'; END IF;
 FOREACH k IN ARRAY fields LOOP
  v := r->>k;
  IF v IS NULL THEN v := E'\\N';
  ELSIF k IN ('luas_tanah','luas_bangunan','harga_total','dp','jumlah_bayar') OR jsonb_typeof(r->k) = 'number' THEN
   v := trim_scale(v::numeric)::text;
  ELSIF k IN ('created_at','diverifikasi_pada') THEN
   v := to_char(v::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  ELSIF k IN ('tanggal_pembelian','tanggal_bayar') THEN v := to_char(v::date, 'YYYY-MM-DD');
  ELSIF k = 'is_auto_inject' OR jsonb_typeof(r->k) = 'boolean' THEN v := (v::boolean)::text;
  ELSIF jsonb_typeof(r->k) IN ('array','object') THEN v := (r->k)::text;
  END IF;
  serialized := serialized || '|' || v;
 END LOOP;
 RETURN md5(serialized);
END $$;

CREATE OR REPLACE FUNCTION public.sync_content_hash(entity text) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public SET timezone = 'UTC' AS $$
DECLARE tbl text; result text;
BEGIN
 tbl := CASE entity WHEN 'companies' THEN 'companies' WHEN 'projects' THEN 'projects'
 WHEN 'clusters' THEN 'clusters' WHEN 'units' THEN 'units' WHEN 'customers' THEN 'users'
 WHEN 'assignments' THEN 'property_assignments' WHEN 'payments' THEN 'payment_history' END;
 IF tbl IS NULL THEN RAISE EXCEPTION 'Unknown entity'; END IF;
 EXECUTE format('SELECT coalesce(md5(string_agg(id::text || '':'' || public.sync_content_row_hash($1, to_jsonb(t)), '','' ORDER BY id::text COLLATE "C")), md5('''')) FROM public.%I t WHERE ($1 <> ''customers'' OR to_jsonb(t)->>''role'' = ''customer'')', tbl)
 INTO result USING entity;
 RETURN result;
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

COMMIT;
