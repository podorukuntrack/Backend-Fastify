-- This file is deliberately outside the normal Drizzle migration chain.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM staging_control.identity WHERE singleton AND sanitized
    AND instance_id::text = current_setting('prtrack.staging_id', true)
    AND database_oid = (SELECT oid FROM pg_database WHERE datname = current_database()))
  THEN RAISE EXCEPTION 'Verified sanitized staging copy required'; END IF;
END $$;
ALTER TABLE payment_history
 ADD COLUMN IF NOT EXISTS jenis varchar(20),
 ADD COLUMN IF NOT EXISTS status_verifikasi varchar(20) NOT NULL DEFAULT 'menunggu',
 ADD COLUMN IF NOT EXISTS rekening_tujuan varchar(30),
 ADD COLUMN IF NOT EXISTS diverifikasi_oleh varchar(150),
 ADD COLUMN IF NOT EXISTS diverifikasi_pada timestamptz,
 ADD COLUMN IF NOT EXISTS dikunci_si boolean NOT NULL DEFAULT false;
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
 WHEN 'payments' THEN ARRAY['id','assignment_id','jumlah_bayar','tanggal_bayar','catatan','bukti_pembayaran','is_auto_inject','created_at','jenis','status_verifikasi','rekening_tujuan','diverifikasi_oleh','diverifikasi_pada']
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
