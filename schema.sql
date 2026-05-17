-- ============================================================
-- Neon-compatible migration for: podorukuntrack
-- Converted from PostgreSQL custom dump (pg_dump -Fc)
-- ============================================================

-- ------------------------------------
-- Extensions
-- ------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ------------------------------------
-- ENUM Types
-- ------------------------------------
CREATE TYPE public.doc_type AS ENUM (
    'foto',
    'video',
    'dokumen',
    'foto_360'
);

CREATE TYPE public.payment_method AS ENUM (
    'cash_lunas',
    'cash_cicil',
    'kredit_kpr'
);

CREATE TYPE public.project_status AS ENUM (
    'active',
    'completed',
    'on_hold'
);

CREATE TYPE public.unit_status AS ENUM (
    'belum_mulai',
    'dalam_pembangunan',
    'selesai'
);

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'admin',
    'customer_service',
    'customer'
);

CREATE TYPE public.user_status AS ENUM (
    'active',
    'inactive'
);

-- ------------------------------------
-- Functions
-- ------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_unit_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit_id UUID;
  v_progress SMALLINT;
BEGIN
  v_unit_id := COALESCE(NEW.unit_id, OLD.unit_id);

  SELECT COALESCE(MAX(progress_percentage), 0)
  INTO v_progress
  FROM progress
  WHERE unit_id = v_unit_id;

  UPDATE units
  SET progress_percentage = v_progress
  WHERE id = v_unit_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_total_pembayaran()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  v_assignment_id := COALESCE(NEW.assignment_id, OLD.assignment_id);

  UPDATE property_assignments
  SET total_dibayar = (
    SELECT COALESCE(SUM(jumlah_bayar), 0)
    FROM payment_history
    WHERE assignment_id = v_assignment_id
  )
  WHERE id = v_assignment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ------------------------------------
-- Tables
-- ------------------------------------
CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_pt text NOT NULL,
    kode_pt text NOT NULL,
    alamat text,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    nama text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    nomor_telepon text,
    role public.user_role DEFAULT 'customer'::public.user_role NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    wa_notifications_enabled boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    nama_proyek text NOT NULL,
    lokasi text NOT NULL,
    deskripsi text,
    status public.project_status DEFAULT 'active'::public.project_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.clusters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    nama_cluster text NOT NULL,
    jumlah_unit integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clusters_jumlah_unit_check CHECK ((jumlah_unit >= 0))
);

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cluster_id uuid NOT NULL,
    nomor_unit text NOT NULL,
    tipe_rumah text,
    luas_tanah numeric(10,2),
    luas_bangunan numeric(10,2),
    status_pembangunan public.unit_status DEFAULT 'belum_mulai'::public.unit_status NOT NULL,
    progress_percentage smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT units_luas_bangunan_check CHECK ((luas_bangunan > (0)::numeric)),
    CONSTRAINT units_luas_tanah_check CHECK ((luas_tanah > (0)::numeric)),
    CONSTRAINT units_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);

CREATE TABLE public.property_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    tanggal_pembelian date DEFAULT CURRENT_DATE NOT NULL,
    status_kepemilikan text DEFAULT 'active'::text NOT NULL,
    tipe_pembayaran public.payment_method NOT NULL,
    harga_total numeric(15,2) NOT NULL,
    total_dibayar numeric(15,2) DEFAULT 0 NOT NULL,
    tenor_bulan integer DEFAULT 0,
    keterangan_kpr text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_assignments_check CHECK (((total_dibayar >= (0)::numeric) AND (total_dibayar <= harga_total))),
    CONSTRAINT property_assignments_harga_total_check CHECK ((harga_total >= (0)::numeric)),
    CONSTRAINT property_assignments_status_kepemilikan_check CHECK ((status_kepemilikan = ANY (ARRAY['active'::text, 'inactive'::text])))
);

CREATE TABLE public.payment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    jumlah_bayar numeric(15,2) NOT NULL,
    tanggal_bayar date DEFAULT CURRENT_DATE NOT NULL,
    catatan text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_history_jumlah_bayar_check CHECK ((jumlah_bayar > (0)::numeric))
);

CREATE TABLE public.progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    tahap text NOT NULL,
    progress_percentage smallint NOT NULL,
    tanggal_update date DEFAULT CURRENT_DATE NOT NULL,
    catatan text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT progress_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);

CREATE TABLE public.documentation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    progress_id uuid,
    jenis public.doc_type NOT NULL,
    url text NOT NULL,
    r2_key text,
    nama_file text,
    ukuran_bytes bigint,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.construction_timelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    tahap text NOT NULL,
    tanggal_rencana_mulai date,
    tanggal_rencana_selesai date,
    tanggal_realisasi_mulai date,
    tanggal_realisasi_selesai date,
    status text DEFAULT 'planned'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT construction_timelines_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'ongoing'::text, 'completed'::text, 'delayed'::text])))
);

CREATE TABLE public.customer_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid,
    customer_id uuid NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT customer_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);

CREATE TABLE public.customer_ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    attachment_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.handovers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    scheduled_date timestamp without time zone NOT NULL,
    actual_date timestamp without time zone,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    proposed_date timestamp without time zone
);

CREATE TABLE public.handover_defects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    handover_id uuid NOT NULL,
    description text NOT NULL,
    image_url text,
    status character varying(50) DEFAULT 'reported'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.retentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    amount numeric(15,2),
    due_date timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.timelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    task_name character varying(255) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'planned'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.project_user_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    table_name text,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.whatsapp_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    nomor_tujuan text NOT NULL,
    template_name text,
    message_body text,
    status text DEFAULT 'queued'::text NOT NULL,
    provider_message_id text,
    response_payload jsonb,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_logs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])))
);

CREATE TABLE IF NOT EXISTS public.user_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fcm_token text NOT NULL UNIQUE,
    device_type character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- ------------------------------------
-- Primary Keys
-- ------------------------------------
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.construction_timelines
    ADD CONSTRAINT construction_timelines_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_ticket_messages
    ADD CONSTRAINT customer_ticket_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_tickets
    ADD CONSTRAINT customer_tickets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.handover_defects
    ADD CONSTRAINT handover_defects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_user_assignments
    ADD CONSTRAINT project_user_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.retentions
    ADD CONSTRAINT retentions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);

-- ------------------------------------
-- Unique Constraints
-- ------------------------------------
ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_kode_pt_key UNIQUE (kode_pt);

ALTER TABLE ONLY public.project_user_assignments
    ADD CONSTRAINT project_user_assignments_project_id_user_id_key UNIQUE (project_id, user_id);

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_cluster_id_nomor_unit_key UNIQUE (cluster_id, nomor_unit);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

-- ------------------------------------
-- Indexes
-- ------------------------------------
CREATE INDEX idx_assignments_user ON public.property_assignments USING btree (user_id);
CREATE INDEX idx_clusters_project ON public.clusters USING btree (project_id);
CREATE INDEX idx_docs_progress ON public.documentation USING btree (progress_id);
CREATE INDEX idx_docs_unit ON public.documentation USING btree (unit_id);
CREATE INDEX idx_payments_assignment ON public.payment_history USING btree (assignment_id);
CREATE INDEX idx_progress_unit_date ON public.progress USING btree (unit_id, tanggal_update DESC);
CREATE INDEX idx_projects_company ON public.projects USING btree (company_id);
CREATE INDEX idx_tickets_customer ON public.customer_tickets USING btree (customer_id);
CREATE INDEX idx_units_cluster ON public.units USING btree (cluster_id);
CREATE INDEX idx_users_company ON public.users USING btree (company_id);
CREATE INDEX idx_whatsapp_logs_user ON public.whatsapp_logs USING btree (user_id);

CREATE UNIQUE INDEX idx_unique_active_assignment
    ON public.property_assignments USING btree (unit_id)
    WHERE (status_kepemilikan = 'active'::text);

-- ------------------------------------
-- Triggers
-- ------------------------------------
CREATE TRIGGER trg_clusters_updated_at
    BEFORE UPDATE ON public.clusters
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_construction_timelines_updated_at
    BEFORE UPDATE ON public.construction_timelines
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_customer_tickets_updated_at
    BEFORE UPDATE ON public.customer_tickets
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_progress_updated_at
    BEFORE UPDATE ON public.progress
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_property_assignments_updated_at
    BEFORE UPDATE ON public.property_assignments
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_sync_progress
    AFTER INSERT OR DELETE OR UPDATE ON public.progress
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_unit_progress();

CREATE TRIGGER trg_units_updated_at
    BEFORE UPDATE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_update_payment
    AFTER INSERT OR DELETE OR UPDATE ON public.payment_history
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_total_pembayaran();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ------------------------------------
-- Foreign Keys
-- ------------------------------------
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_cluster_id_fkey
    FOREIGN KEY (cluster_id) REFERENCES public.clusters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_assignment_id_fkey
    FOREIGN KEY (assignment_id) REFERENCES public.property_assignments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_progress_id_fkey
    FOREIGN KEY (progress_id) REFERENCES public.progress(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.construction_timelines
    ADD CONSTRAINT construction_timelines_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_tickets
    ADD CONSTRAINT customer_tickets_assignment_id_fkey
    FOREIGN KEY (assignment_id) REFERENCES public.property_assignments(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.customer_tickets
    ADD CONSTRAINT customer_tickets_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_ticket_messages
    ADD CONSTRAINT customer_ticket_messages_ticket_id_fkey
    FOREIGN KEY (ticket_id) REFERENCES public.customer_tickets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customer_ticket_messages
    ADD CONSTRAINT customer_ticket_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units(id);

ALTER TABLE ONLY public.handover_defects
    ADD CONSTRAINT handover_defects_handover_id_fkey
    FOREIGN KEY (handover_id) REFERENCES public.handovers(id);

ALTER TABLE ONLY public.retentions
    ADD CONSTRAINT retentions_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.retentions
    ADD CONSTRAINT retentions_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units(id);

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.units(id);

ALTER TABLE ONLY public.project_user_assignments
    ADD CONSTRAINT project_user_assignments_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_user_assignments
    ADD CONSTRAINT project_user_assignments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ------------------------------------
-- Views
-- ------------------------------------
CREATE VIEW public.v_assignment_detail AS
SELECT
    pa.id AS assignment_id,
    pa.tanggal_pembelian,
    pa.tipe_pembayaran,
    pa.harga_total,
    pa.total_dibayar,
    round(((pa.total_dibayar / NULLIF(pa.harga_total, (0)::numeric)) * (100)::numeric), 2) AS persentase_dibayar,
    u.nomor_unit,
    u.progress_percentage AS progress_pembangunan,
    c.nama_cluster,
    p.nama_proyek,
    usr.nama AS customer_nama,
    usr.email AS customer_email,
    comp.nama_pt
FROM (((((public.property_assignments pa
    JOIN public.users usr ON ((usr.id = pa.user_id)))
    JOIN public.units u ON ((u.id = pa.unit_id)))
    JOIN public.clusters c ON ((c.id = u.cluster_id)))
    JOIN public.projects p ON ((p.id = c.project_id)))
    JOIN public.companies comp ON ((comp.id = p.company_id)));

CREATE VIEW public.v_unit_detail AS
SELECT
    u.id AS unit_id,
    u.nomor_unit,
    u.tipe_rumah,
    u.luas_tanah,
    u.luas_bangunan,
    u.status_pembangunan,
    u.progress_percentage,
    c.id AS cluster_id,
    c.nama_cluster,
    p.id AS project_id,
    p.nama_proyek,
    p.lokasi AS project_lokasi,
    comp.id AS company_id,
    comp.nama_pt,
    comp.kode_pt
FROM (((public.units u
    JOIN public.clusters c ON ((c.id = u.cluster_id)))
    JOIN public.projects p ON ((p.id = c.project_id)))
    JOIN public.companies comp ON ((comp.id = p.company_id)));