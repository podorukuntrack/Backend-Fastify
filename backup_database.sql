--
-- PostgreSQL database dump
--

\restrict YIHrodVciqZVI2YD4J5FdBMWPFPdjkUGchTVilRen7YiiL2Om9wulu45tL3tP2C

-- Dumped from database version 18.4 (48c2093)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO neondb_owner;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: doc_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.doc_type AS ENUM (
    'foto',
    'video',
    'dokumen',
    'foto_360'
);


ALTER TYPE public.doc_type OWNER TO neondb_owner;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.payment_method AS ENUM (
    'cash_lunas',
    'cash_cicil',
    'kredit_kpr'
);


ALTER TYPE public.payment_method OWNER TO neondb_owner;

--
-- Name: project_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.project_status AS ENUM (
    'active',
    'completed',
    'on_hold'
);


ALTER TYPE public.project_status OWNER TO neondb_owner;

--
-- Name: unit_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.unit_status AS ENUM (
    'belum_mulai',
    'dalam_pembangunan',
    'selesai'
);


ALTER TYPE public.unit_status OWNER TO neondb_owner;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'admin',
    'customer_service',
    'customer'
);


ALTER TYPE public.user_role OWNER TO neondb_owner;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public.user_status OWNER TO neondb_owner;

--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_set_updated_at() OWNER TO neondb_owner;

--
-- Name: fn_sync_unit_progress(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.fn_sync_unit_progress() RETURNS trigger
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


ALTER FUNCTION public.fn_sync_unit_progress() OWNER TO neondb_owner;

--
-- Name: fn_update_total_pembayaran(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.fn_update_total_pembayaran() RETURNS trigger
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


ALTER FUNCTION public.fn_update_total_pembayaran() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: neondb_owner
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: neondb_owner
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: neondb_owner
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

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


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: clusters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clusters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    nama_cluster text NOT NULL,
    jumlah_unit integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clusters_jumlah_unit_check CHECK ((jumlah_unit >= 0))
);


ALTER TABLE public.clusters OWNER TO neondb_owner;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_pt text NOT NULL,
    kode_pt text NOT NULL,
    alamat text,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    theme_color character varying(50) DEFAULT '#4f46e5'::character varying
);


ALTER TABLE public.companies OWNER TO neondb_owner;

--
-- Name: construction_timelines; Type: TABLE; Schema: public; Owner: neondb_owner
--

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


ALTER TABLE public.construction_timelines OWNER TO neondb_owner;

--
-- Name: documentation; Type: TABLE; Schema: public; Owner: neondb_owner
--

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


ALTER TABLE public.documentation OWNER TO neondb_owner;

--
-- Name: handover_defects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.handover_defects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    handover_id uuid NOT NULL,
    description text NOT NULL,
    image_url text,
    status character varying(50) DEFAULT 'reported'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.handover_defects OWNER TO neondb_owner;

--
-- Name: handovers; Type: TABLE; Schema: public; Owner: neondb_owner
--

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
    proposed_date timestamp without time zone,
    image_url text,
    document_url text
);


ALTER TABLE public.handovers OWNER TO neondb_owner;

--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    jumlah_bayar numeric(15,2) NOT NULL,
    tanggal_bayar date DEFAULT CURRENT_DATE NOT NULL,
    catatan text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    bukti_pembayaran text,
    CONSTRAINT payment_history_jumlah_bayar_check CHECK ((jumlah_bayar > (0)::numeric))
);


ALTER TABLE public.payment_history OWNER TO neondb_owner;

--
-- Name: progress; Type: TABLE; Schema: public; Owner: neondb_owner
--

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


ALTER TABLE public.progress OWNER TO neondb_owner;

--
-- Name: project_user_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.project_user_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_role public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_user_assignments OWNER TO neondb_owner;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    nama_proyek text NOT NULL,
    lokasi text NOT NULL,
    deskripsi text,
    status public.project_status DEFAULT 'active'::public.project_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    theme_color character varying(50) DEFAULT '#4f46e5'::character varying
);


ALTER TABLE public.projects OWNER TO neondb_owner;

--
-- Name: property_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

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


ALTER TABLE public.property_assignments OWNER TO neondb_owner;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO neondb_owner;

--
-- Name: retentions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.retentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    due_date timestamp without time zone NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    link_foto_360 text,
    photo_before_url text,
    photo_after_url text
);


ALTER TABLE public.retentions OWNER TO neondb_owner;

--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ticket_messages (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT customer_ticket_messages_id_not_null NOT NULL,
    ticket_id uuid CONSTRAINT customer_ticket_messages_ticket_id_not_null NOT NULL,
    sender_id uuid CONSTRAINT customer_ticket_messages_sender_id_not_null NOT NULL,
    message text CONSTRAINT customer_ticket_messages_message_not_null NOT NULL,
    attachment_url text,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT customer_ticket_messages_created_at_not_null NOT NULL
);


ALTER TABLE public.ticket_messages OWNER TO neondb_owner;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT customer_tickets_id_not_null NOT NULL,
    assignment_id uuid,
    customer_id uuid CONSTRAINT customer_tickets_customer_id_not_null NOT NULL,
    subject text CONSTRAINT customer_tickets_subject_not_null NOT NULL,
    status text DEFAULT 'open'::text CONSTRAINT customer_tickets_status_not_null NOT NULL,
    priority text DEFAULT 'normal'::text CONSTRAINT customer_tickets_priority_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT customer_tickets_created_at_not_null NOT NULL,
    updated_at timestamp with time zone DEFAULT now() CONSTRAINT customer_tickets_updated_at_not_null NOT NULL,
    CONSTRAINT customer_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT customer_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);


ALTER TABLE public.tickets OWNER TO neondb_owner;

--
-- Name: timelines; Type: TABLE; Schema: public; Owner: neondb_owner
--

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


ALTER TABLE public.timelines OWNER TO neondb_owner;

--
-- Name: units; Type: TABLE; Schema: public; Owner: neondb_owner
--

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
    image_url text,
    CONSTRAINT units_luas_bangunan_check CHECK ((luas_bangunan > (0)::numeric)),
    CONSTRAINT units_luas_tanah_check CHECK ((luas_tanah > (0)::numeric)),
    CONSTRAINT units_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);


ALTER TABLE public.units OWNER TO neondb_owner;

--
-- Name: user_devices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    fcm_token text NOT NULL,
    device_type character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_devices OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

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


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: v_assignment_detail; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.v_assignment_detail AS
 SELECT pa.id AS assignment_id,
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


ALTER VIEW public.v_assignment_detail OWNER TO neondb_owner;

--
-- Name: v_unit_detail; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.v_unit_detail AS
 SELECT u.id AS unit_id,
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


ALTER VIEW public.v_unit_detail OWNER TO neondb_owner;

--
-- Name: whatsapp_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

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
    company_id uuid,
    CONSTRAINT whatsapp_logs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])))
);


ALTER TABLE public.whatsapp_logs OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: neondb_owner
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_data, new_data, created_at) FROM stdin;
\.


--
-- Data for Name: clusters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clusters (id, project_id, nama_cluster, jumlah_unit, created_at, updated_at) FROM stdin;
e34deca2-1730-4b72-9537-202596d70ca8	13dc0008-4bea-45e1-86bb-3d390b19be50	Cluster 1	10	2026-06-14 02:59:57.004911+00	2026-06-14 02:59:57.004911+00
fb474c2c-f7eb-4dbb-9bb3-12c2ac5069db	ada94a37-33ab-4b42-acf7-e7c50e139805	Blok R	3	2026-06-15 12:33:01.883626+00	2026-06-15 12:33:01.883626+00
135ea701-d779-43f9-9b89-5da641ad68cd	ada94a37-33ab-4b42-acf7-e7c50e139805	Blok A	12	2026-06-15 12:33:13.32313+00	2026-06-15 12:33:13.32313+00
5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	32d7e8f7-e85a-4404-ada4-0783b6a4d3aa	Blok A	59	2026-06-16 08:52:08.316348+00	2026-06-16 09:25:10.482088+00
ace82624-3114-4ecc-ad02-4e33d4b5b1cf	586b4b2a-d747-4e46-b201-bfe1d2697291	Galardo	10	2026-06-17 03:01:41.557773+00	2026-06-17 03:01:56.506407+00
5072a410-c595-4ce3-a669-126101180355	586b4b2a-d747-4e46-b201-bfe1d2697291	Veneno	10	2026-06-17 03:02:13.899555+00	2026-06-17 03:02:13.899555+00
c32a8281-0c74-43ee-908b-06a132f58644	586b4b2a-d747-4e46-b201-bfe1d2697291	Aventador	10	2026-06-17 03:02:29.273228+00	2026-06-17 03:02:29.273228+00
081f8918-e446-41fa-8d08-eff6c299a547	586b4b2a-d747-4e46-b201-bfe1d2697291	Ruko Sultan	6	2026-06-17 03:02:46.264756+00	2026-06-17 03:02:46.264756+00
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.companies (id, nama_pt, kode_pt, alamat, logo_url, created_at, updated_at, theme_color) FROM stdin;
255a2048-be78-42a4-9b57-24a39cf9573a	Podorukun Sukses Makmur	PSM	\N	\N	2026-05-19 11:55:38.920961+00	2026-05-26 03:03:52.556881+00	#000000
4f7ed319-636f-4c74-83df-a823408f0a04	PT Podo Rukun Jaya Properti	PRJP	\N	https://assets.podorukuntrack.com/1779259516101-5ae5206f41f5ad04.PNG	2026-05-19 09:37:02.52194+00	2026-05-26 03:04:15.671549+00	#000357
2e50c6ee-4039-4e3a-b751-99cdc934c14d	PT Podo Rukun Nusantara	PRN	\N	https://assets.podorukuntrack.com/1779190812585-0e93ce51b48a6979.png	2026-05-19 10:44:16.131368+00	2026-05-26 03:04:33.030575+00	#fafa00
\.


--
-- Data for Name: construction_timelines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.construction_timelines (id, unit_id, tahap, tanggal_rencana_mulai, tanggal_rencana_selesai, tanggal_realisasi_mulai, tanggal_realisasi_selesai, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: documentation; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documentation (id, unit_id, progress_id, jenis, url, r2_key, nama_file, ukuran_bytes, created_by, created_at) FROM stdin;
96e5ac50-a756-40ef-ab83-f45fc6842534	9bad6517-b817-498b-ac3a-fce73ee4f334	14263e22-26f7-4212-a389-36bb0cb14700	foto	https://assets.podorukuntrack.com/1781406592357-df88d00a6f0f0f45.jpg	1781406592357-df88d00a6f0f0f45.jpg	pondasi.jpg	841245	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-14 03:09:53.337834+00
f0943218-f6e1-4e20-8f58-8a5a205deb62	d5b81b38-2c45-44de-8304-0088725f8008	\N	foto	https://assets.podorukuntrack.com/1781600712236-ee81c9f1d8e2f2e2.jpeg	1781600712236-ee81c9f1d8e2f2e2.jpeg	WhatsApp Image 2026-06-16 at 16.02.47 (2).jpeg	217782	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-16 09:05:12.600675+00
36176887-6752-4ac2-a4f6-afd27e23251c	9bad6517-b817-498b-ac3a-fce73ee4f334	14263e22-26f7-4212-a389-36bb0cb14700	foto	https://assets.podorukuntrack.com/1781666583811-2d4c6530e5ec9eef.png	1781666583811-2d4c6530e5ec9eef.png	Screenshot 2025-12-04 010022.png	65835	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:23:04.29382+00
61d5085c-8f06-481d-a0f7-3d536e5b01c0	9bad6517-b817-498b-ac3a-fce73ee4f334	14263e22-26f7-4212-a389-36bb0cb14700	foto	https://assets.podorukuntrack.com/1781666584636-4de725e024f89776.png	1781666584636-4de725e024f89776.png	Screenshot 2025-12-04 010813.png	192876	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:23:05.823184+00
ce1bd252-3d3e-4aa1-8e1c-6f9db4fef174	9bad6517-b817-498b-ac3a-fce73ee4f334	14263e22-26f7-4212-a389-36bb0cb14700	foto	https://assets.podorukuntrack.com/1781666586142-2a5e7240fbdc5d44.png	1781666586142-2a5e7240fbdc5d44.png	Screenshot 2025-12-04 010905.png	175120	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:23:06.466633+00
a84fac39-422b-479e-b2fd-f77ae605d545	9bad6517-b817-498b-ac3a-fce73ee4f334	14263e22-26f7-4212-a389-36bb0cb14700	foto	https://assets.podorukuntrack.com/1781666586677-a904b92249def604.png	1781666586677-a904b92249def604.png	Screenshot 2025-12-04 184441.png	35536	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:23:06.989131+00
26c7cc79-639c-4968-9620-5c0aa5f97aad	9bad6517-b817-498b-ac3a-fce73ee4f334	\N	foto	https://assets.podorukuntrack.com/1781666731003-55e71f8775797972.jpg	1781666731003-55e71f8775797972.jpg	images.jpg	10364	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:25:31.336396+00
23ab9bb6-8f3c-4bdb-84cc-7916a5ee93c0	62359290-f8a8-4349-9939-55168b219d84	3e88d97b-36d5-409e-a7c4-e49c8c9d00f4	foto	https://assets.podorukuntrack.com/1781837846287-00e7bda4dbb09686.jpeg	1781837846287-00e7bda4dbb09686.jpeg	WhatsApp Image 2026-06-19 at 09.42.29.jpeg	68197	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 02:57:27.444871+00
ad9715fa-593f-41e2-828c-18a6c2d58e25	254fc2f7-1231-4172-af3e-39000f79eb0d	\N	foto	https://assets.podorukuntrack.com/1781838843386-be019eb31ac00c90.jpeg	1781838843386-be019eb31ac00c90.jpeg	WhatsApp Image 2026-06-19 at 10.09.10 (5).jpeg	220753	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:14:03.923026+00
1e0e678a-419b-49cd-998b-f504c2ce0924	254fc2f7-1231-4172-af3e-39000f79eb0d	1023de83-14d9-4cc7-a346-7db0d2fb15d6	foto	https://assets.podorukuntrack.com/1781839862395-e4440336e68c90c4.jpeg	1781839862395-e4440336e68c90c4.jpeg	WhatsApp Image 2026-06-19 at 10.09.09 (2).jpeg	155666	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:31:02.820472+00
278819eb-00c5-4f4c-8c20-7d251a697e2b	254fc2f7-1231-4172-af3e-39000f79eb0d	c222f433-ef07-477a-8c2b-4820fa29f492	foto	https://assets.podorukuntrack.com/1781839988776-543e3098800403ac.jpeg	1781839988776-543e3098800403ac.jpeg	WhatsApp Image 2026-06-19 at 10.09.09 (5).jpeg	126802	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:33:09.085445+00
c4deba3f-9cbe-4598-b8b6-d7c63f7075e6	254fc2f7-1231-4172-af3e-39000f79eb0d	8a86df6a-6c8f-4ee5-9c52-829a8bbca6df	foto	https://assets.podorukuntrack.com/1781840085894-26181c2061e771f1.jpeg	1781840085894-26181c2061e771f1.jpeg	WhatsApp Image 2026-06-19 at 10.09.09 (6).jpeg	194751	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:34:46.321011+00
185a11ed-708c-4ab9-b513-11606ce8daae	254fc2f7-1231-4172-af3e-39000f79eb0d	2d575b9e-3689-40ac-8ce0-37180e7d2fcb	foto	https://assets.podorukuntrack.com/1781840160176-2858870361d60823.jpeg	1781840160176-2858870361d60823.jpeg	WhatsApp Image 2026-06-19 at 10.09.09 (9).jpeg	246474	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:36:00.620912+00
6dca8aa8-0bfb-4c9c-a3f1-4649adcffb5c	254fc2f7-1231-4172-af3e-39000f79eb0d	3217e532-d0ab-482b-830f-b496431383f7	foto	https://assets.podorukuntrack.com/1781840199655-346330d5cc3e4808.jpeg	1781840199655-346330d5cc3e4808.jpeg	WhatsApp Image 2026-06-19 at 10.09.10 (2).jpeg	245953	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:36:40.157089+00
12c2c767-27b2-4d1e-b75b-40869d78e267	254fc2f7-1231-4172-af3e-39000f79eb0d	3abded3a-6773-4ff4-b106-773535fcdf3d	foto	https://assets.podorukuntrack.com/1781840236560-ce0384f689208209.jpeg	1781840236560-ce0384f689208209.jpeg	WhatsApp Image 2026-06-19 at 10.09.10 (5).jpeg	220753	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:37:16.994906+00
\.


--
-- Data for Name: handover_defects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.handover_defects (id, handover_id, description, image_url, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: handovers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.handovers (id, company_id, unit_id, scheduled_date, actual_date, status, notes, created_at, updated_at, proposed_date, image_url, document_url) FROM stdin;
1299e482-6d71-4d64-be83-f18960624612	4f7ed319-636f-4c74-83df-a823408f0a04	b4440a65-65ab-4388-8355-53b7d09d3795	2026-06-30 03:35:00	\N	menunggu_respon_customer		2026-06-17 02:34:43.432893	2026-06-17 02:34:43.432893	\N	\N	\N
2e8e50d3-8b77-464d-91d4-792b8b419fd5	4f7ed319-636f-4c74-83df-a823408f0a04	d5b81b38-2c45-44de-8304-0088725f8008	2026-06-18 06:41:00	2026-06-17 03:43:11.963	selesai		2026-06-17 03:42:07.483973	2026-06-17 03:43:12.622	\N	https://assets.podorukuntrack.com/1781667791908-edc388d3bb02b4cb.jpg	\N
51631e74-b53e-4863-b829-7c84a298dd38	4f7ed319-636f-4c74-83df-a823408f0a04	4a624625-8098-47c1-a8b6-5af3072c7df1	2026-06-18 15:12:00	\N	dijadwalkan		2026-06-18 14:12:20.839373	2026-06-18 14:12:43.047	\N	\N	\N
\.


--
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payment_history (id, assignment_id, jumlah_bayar, tanggal_bayar, catatan, created_by, created_at, bukti_pembayaran) FROM stdin;
\.


--
-- Data for Name: progress; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.progress (id, unit_id, tahap, progress_percentage, tanggal_update, catatan, created_by, created_at, updated_at) FROM stdin;
31970768-ee99-41d8-9866-82a125715427	b4440a65-65ab-4388-8355-53b7d09d3795	Finishing	100	2026-06-08		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 02:33:33.624039+00	2026-06-17 02:33:58.858998+00
14263e22-26f7-4212-a389-36bb0cb14700	9bad6517-b817-498b-ac3a-fce73ee4f334	Tahap Bangun	72	2026-06-14		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-14 03:09:50.672375+00	2026-06-17 03:23:03.299911+00
ed430ded-0dfe-46c0-b192-b79e821303c4	d5b81b38-2c45-44de-8304-0088725f8008	Pondasi	100	2026-06-17		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:39:00.841467+00	2026-06-17 03:40:51.953117+00
540745ae-8812-4131-855c-e0a310e7db2a	d5b81b38-2c45-44de-8304-0088725f8008	dinding	100	2026-06-17		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:41:03.085561+00	2026-06-17 03:41:03.085561+00
f975c446-552a-4d70-b33f-04e1f872abf6	d5b81b38-2c45-44de-8304-0088725f8008	Atap	100	2026-06-17		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 03:41:15.967894+00	2026-06-17 03:41:15.967894+00
3e88d97b-36d5-409e-a7c4-e49c8c9d00f4	62359290-f8a8-4349-9939-55168b219d84	Finish	100	2026-06-19		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 02:57:25.765574+00	2026-06-19 02:57:25.765574+00
1023de83-14d9-4cc7-a346-7db0d2fb15d6	254fc2f7-1231-4172-af3e-39000f79eb0d	Pondasi	100	2026-06-19		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:31:01.658182+00	2026-06-19 03:31:01.658182+00
c222f433-ef07-477a-8c2b-4820fa29f492	254fc2f7-1231-4172-af3e-39000f79eb0d	Pasangan Bata Lantai 1	100	2026-02-02		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:33:08.154054+00	2026-06-19 03:33:27.521603+00
8a86df6a-6c8f-4ee5-9c52-829a8bbca6df	254fc2f7-1231-4172-af3e-39000f79eb0d	Dak Cor	100	2026-02-08		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:34:45.179493+00	2026-06-19 03:34:45.179493+00
3217e532-d0ab-482b-830f-b496431383f7	254fc2f7-1231-4172-af3e-39000f79eb0d	Atap	100	2026-04-16		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:36:38.99339+00	2026-06-19 03:36:38.99339+00
3abded3a-6773-4ff4-b106-773535fcdf3d	254fc2f7-1231-4172-af3e-39000f79eb0d	Plester - Aci - Plamir	100	2026-06-15		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:37:15.771707+00	2026-06-19 03:37:15.771707+00
6ca2df6e-526b-451e-bf22-3de09db20ec9	254fc2f7-1231-4172-af3e-39000f79eb0d	Pemasangan Granit	10	2026-06-19		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:37:44.539343+00	2026-06-19 03:37:44.539343+00
2d575b9e-3689-40ac-8ce0-37180e7d2fcb	254fc2f7-1231-4172-af3e-39000f79eb0d	Pasangan Bata Lantai 2	100	2026-03-25		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:35:36.592401+00	2026-06-19 03:46:04.431163+00
1aa3c4c1-3fe8-4feb-8803-6f23814a1023	4a624625-8098-47c1-a8b6-5af3072c7df1	bangun	76	2026-06-19		e716ec9c-5eae-4737-823a-e05517d1979b	2026-06-19 10:19:06.936045+00	2026-06-19 10:29:16.830355+00
\.


--
-- Data for Name: project_user_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.project_user_assignments (id, project_id, user_id, assigned_role, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.projects (id, company_id, nama_proyek, lokasi, deskripsi, status, created_by, created_at, updated_at, logo_url, theme_color) FROM stdin;
32d7e8f7-e85a-4404-ada4-0783b6a4d3aa	4f7ed319-636f-4c74-83df-a823408f0a04	Griya Adhinata	Karangploso	Griya Adhinata Residence, Hunian Terjangkau Untuk Keluarga. Cocok untuk slow living dengan pemandangan Gunung Arjuna yang indah.	active	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-16 08:50:51.032673+00	2026-06-16 08:50:51.032673+00	https://assets.podorukuntrack.com/1781599801651-0e5fbab5861c2cd6.png	#4f46e5
13dc0008-4bea-45e1-86bb-3d390b19be50	4f7ed319-636f-4c74-83df-a823408f0a04	Casa Lavenia	Sukun	Hunian Strategis di Kota Malang	active	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-14 02:58:03.725197+00	2026-06-16 08:51:35.572+00	https://assets.podorukuntrack.com/1781599869381-0e4b16c5cc4e5966.png	#e2e548
cc74c650-4cdb-4de7-a6e3-209cb10f0ce6	2e50c6ee-4039-4e3a-b751-99cdc934c14d	Green Amalia	Junrejo, Batu		active	c7e97843-8ca6-4cd3-acbf-e430d347bab8	2026-06-16 16:26:27.40448+00	2026-06-16 16:26:27.40448+00	https://assets.podorukuntrack.com/1781627066259-d10c638b3496fae2.webp	#82c403
586b4b2a-d747-4e46-b201-bfe1d2697291	4f7ed319-636f-4c74-83df-a823408f0a04	The Sultan Regency	Dau Kab. Malang	Hunian Strategis di Kota Malang dengan konsep industrial modern.	active	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 02:40:25.969358+00	2026-06-17 02:40:25.969358+00	https://assets.podorukuntrack.com/1781663994800-bd01253384af2c30.PNG	#a003b5
ada94a37-33ab-4b42-acf7-e7c50e139805	4f7ed319-636f-4c74-83df-a823408f0a04	Green Amalia	Junrejo Batu		active	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-15 12:32:39.105657+00	2026-06-17 02:44:42.658+00	https://assets.podorukuntrack.com/1781664281044-dd09df2a64724d26.jpg	#058f05
\.


--
-- Data for Name: property_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.property_assignments (id, user_id, unit_id, tanggal_pembelian, status_kepemilikan, tipe_pembayaran, harga_total, total_dibayar, tenor_bulan, keterangan_kpr, created_by, created_at, updated_at) FROM stdin;
5a29786d-aa4c-442d-ba01-0331f659b893	97911dcd-aa5d-4ec7-a349-9863dcd7d591	d5b81b38-2c45-44de-8304-0088725f8008	2026-05-01	active	kredit_kpr	307500000.00	0.00	15	BSN (Bank BTN Syariah)	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-16 09:06:14.298748+00	2026-06-16 09:06:14.298748+00
811075d9-2772-42a5-ad75-65b38ecc0e35	c20d4124-5651-4527-97f5-9ebb5052395d	fcf8ed60-151e-4569-9128-ad9287d3658c	2026-06-16	active	cash_lunas	250000000.00	250000000.00	0		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-16 17:33:56.473724+00	2026-06-16 17:33:56.473724+00
4f907fd2-ae56-4f33-bb6e-94d4add3d6b6	8f1d95eb-02e7-4681-900c-0baac153ebe1	b4440a65-65ab-4388-8355-53b7d09d3795	2026-06-01	active	cash_lunas	307500000.00	307500000.00	0		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-17 02:31:52.786348+00	2026-06-17 02:31:52.786348+00
58029888-8dfc-4ba2-8972-831d22a64abb	97911dcd-aa5d-4ec7-a349-9863dcd7d591	9bad6517-b817-498b-ac3a-fce73ee4f334	2026-06-14	active	kredit_kpr	500000000.00	450000000.00	12		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-14 03:06:49.208583+00	2026-06-17 04:02:14.873313+00
1ab96696-6dea-43ab-a536-9ffe6d4f5012	d4124f11-97fc-41dc-a4f0-e010a552cdf1	4a624625-8098-47c1-a8b6-5af3072c7df1	2026-06-18	active	cash_lunas	450000000.00	450000000.00	0		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-18 14:10:48.93227+00	2026-06-18 14:10:48.93227+00
fba5362c-1b7b-4a01-ac30-9b3e16e7569e	480a746a-dcb4-488e-b2f9-9aae12c1a625	62359290-f8a8-4349-9939-55168b219d84	2026-06-19	active	cash_lunas	689000000.00	689000000.00	0		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 02:51:22.357146+00	2026-06-19 02:51:22.357146+00
bd1e9b29-2281-45aa-a8f0-aa5f2a8c8ab0	b942e05c-7962-4930-828d-64eecab26546	254fc2f7-1231-4172-af3e-39000f79eb0d	2025-10-19	active	cash_lunas	820000000.00	820000000.00	0		277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2026-06-19 03:10:01.774246+00	2026-06-19 03:10:01.774246+00
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) FROM stdin;
6cd8fe7b-bac6-40ec-a5aa-b1ab366e0943	e716ec9c-5eae-4737-823a-e05517d1979b	af1ead26849c506510e55f796f40aa1b23e4867a779242d7015c7cd736885f15	2026-07-13 12:28:54.687+00	f	2026-06-13 12:28:54.697055+00
658de1a9-6b62-495c-9cab-1b89564655b9	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	42a44e9721525f07ccc1755e29959bb1057f3565d8637129d02daf702d58d6c9	2026-07-13 16:10:29.752+00	t	2026-06-13 16:10:29.758927+00
b476ddeb-5f8d-4b5f-b4e5-4d0cb359a48b	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	1ce9d93edb8b1add11313b6acef9253bf647b67b089435874966f0e203c403e8	2026-07-14 02:53:26.498+00	f	2026-06-14 02:53:26.541043+00
6d00b4af-0327-424d-ace2-15faef9c39e1	97911dcd-aa5d-4ec7-a349-9863dcd7d591	077b196620b19be5a927225c9de0cadf73ad3e6bbb96547c72d54b9cc2e6ac87	2026-07-14 03:02:19.966+00	f	2026-06-14 03:02:19.975426+00
10922ec1-c15c-42fe-9543-5212ce19eb90	97911dcd-aa5d-4ec7-a349-9863dcd7d591	2d02c39c3084b39cc3d151e5fbef52078a1b7f369095447e351a52995e029813	2026-07-14 03:04:13.909+00	f	2026-06-14 03:04:13.9172+00
41032e07-a7b5-41de-9027-67acc677591a	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	52f5399071f7685f9dcd27594b0daeeefc556d6904fe20a535eaecd8775afb0d	2026-07-14 02:56:10.95+00	t	2026-06-14 02:56:10.95767+00
6baace06-aba1-44a2-a520-86bd2f0addab	c7e97843-8ca6-4cd3-acbf-e430d347bab8	d8eb3598907aecd0520019dc281e3f2321dd0a5e313e7c666a7f3e1117470b2a	2026-07-15 12:41:22.647+00	f	2026-06-15 12:41:22.654367+00
05fb7f0f-244c-44a9-a457-fe360c177fa0	c7e97843-8ca6-4cd3-acbf-e430d347bab8	b4fc7acb1a053e3be9b8b7622aa0348e6027980c2491d466490b5435172e2999	2026-07-15 12:43:41.808+00	f	2026-06-15 12:43:41.815328+00
3626554f-60c5-4e52-8e90-8265f4596892	e716ec9c-5eae-4737-823a-e05517d1979b	7056d6d9f43d6422a2db262ad67390f7cdff3d4b1ef8a6691794d74e673f687f	2026-07-15 12:45:13.569+00	f	2026-06-15 12:45:13.579652+00
6afe2e7c-1969-451c-b07d-c83e1dc171f1	59f10904-c467-4f49-994f-0bdaf66abecb	62f312deb2ada1ec502d5c6ff1285c6c868d3ca807b1a36a007f7f3f85f9d5c4	2026-07-15 12:46:39.862+00	f	2026-06-15 12:46:39.869089+00
87232c6d-76dd-4622-82e7-622727b7ad28	59f10904-c467-4f49-994f-0bdaf66abecb	294c5f7656a6a3460766c20ec2c1ac91bf0895241c4887c1c69a8d287ced4910	2026-07-15 12:50:38.62+00	f	2026-06-15 12:50:38.62976+00
e8755f6b-d088-4cb4-a497-c38fbc3e0c74	97911dcd-aa5d-4ec7-a349-9863dcd7d591	be6a7b264504d29a4760c45f9d475d1f3be62035fa943b73ace4a3e21c95f569	2026-07-15 12:29:08.868+00	t	2026-06-15 12:29:08.876238+00
ce4cf90d-95c2-470e-b667-0c0e30720e14	97911dcd-aa5d-4ec7-a349-9863dcd7d591	f25a1f8ec35d6c31bbb6f33bf1870f598d0aee20f6a8af1de2e77d76c16f89a5	2026-07-15 12:55:59.088+00	f	2026-06-15 12:55:59.128862+00
ca5d0110-6f76-44ca-836e-b5b3d73c870f	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	01a4ee5b2f03d6b0b51886bd0980dccf7c244e062b8b44d4053aa4b633b98511	2026-07-15 12:30:56.389+00	t	2026-06-15 12:30:56.396799+00
44dbbaf2-2cff-49b0-a8bb-48d80305eae4	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	22ca7b8818087525f35dece9f138b3d501a49081ffac74f2452e6f9aec5364e7	2026-07-16 01:39:23.593+00	f	2026-06-16 01:39:23.63653+00
e003b234-3e3e-4375-b35f-df6465b8bf0e	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	e5a7713bf6e803377a2a522081f79ffb5c62313e3d7ced7014ae2e3ec4d54d98	2026-07-16 01:39:23.595+00	f	2026-06-16 01:39:23.643923+00
d08ffa8a-2caf-4e4f-9558-aa6c5fcec09b	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	49e8947b582fe592d734c6a1d59d309ed34aa5d54f8993ae7b8d75222c7847ab	2026-07-16 08:44:34.855+00	t	2026-06-16 08:44:34.863015+00
30c25360-b8e2-4e85-b347-40e450bc1c71	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	9d09005c9174099094a642b24f5720f412df475ef8210a63a9c13e211917b55b	2026-07-16 09:00:34.588+00	t	2026-06-16 09:00:34.605412+00
fdedba5a-7683-4aaa-b8e7-2c1368e3c69d	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	d817f0b53ee53fc92d0820ec3336ec2f242acdda9f3c600735d7067797c257ff	2026-07-16 15:08:29.712+00	f	2026-06-16 15:08:29.719206+00
879fe9ef-3e53-460a-b85b-41a112844310	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	26973f8d643b0ce4b9252236502a684d35116a768b7e1e0b1118d8e55b47b3b8	2026-07-16 15:57:23.649+00	f	2026-06-16 15:57:23.656196+00
a13c1319-5ebd-4b75-a24b-394c735dcd19	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	d555c98f2721dee4a48f5f5bfa94c3c4d57a65d53394af976cb54618c9c587a2	2026-07-16 16:04:00.817+00	f	2026-06-16 16:04:00.824794+00
23899022-4517-44a9-943c-f1340d0b2c22	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	76ad6e11fba496de9ace6f774be6a49decbefa8d0e6889f83b63a98607e83ce0	2026-07-16 17:14:33.984+00	t	2026-06-16 17:14:33.992279+00
02525022-9b3f-4395-99a9-60612895d1c3	c7e97843-8ca6-4cd3-acbf-e430d347bab8	d603c7e5119d6f85734f700d1a7903d0b7b92b23957926b955a3a9883d4394f5	2026-07-16 16:04:46.347+00	t	2026-06-16 16:04:46.354429+00
f3f65c7d-1d3e-4dc6-b6e4-82ac8bed88dc	c7e97843-8ca6-4cd3-acbf-e430d347bab8	b5f1bd704ab9bcd4c74b9416cdc9f80955ac0995bfe1d37c66cd80ffdd200d24	2026-07-16 16:24:23.042+00	f	2026-06-16 16:24:23.084208+00
bd92c53a-6f9f-432e-8e0e-f93253f86fba	c7e97843-8ca6-4cd3-acbf-e430d347bab8	9574a490fe8a48eef308bb4610ee9187123be1441a4b98f4f127cfbeca44d744	2026-07-16 16:24:23.044+00	f	2026-06-16 16:24:23.091227+00
fd74c071-684b-422b-a5a7-a4d931f42d51	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	efd0c75a215a8ff883d5b4855e8928e3ccec104ecba90d47d4467509dd516544	2026-07-16 16:07:05.674+00	t	2026-06-16 16:07:05.682953+00
b490e6ef-4ab3-4e57-939c-e4e2fe74097a	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	86a7c7216a8b156e89aad3ef54ccf02a35470e0a5e3481bdf16ff8591d9c2915	2026-07-16 16:26:44.992+00	t	2026-06-16 16:26:45.035377+00
12e47891-43b7-44ba-8b6f-7cbba68daf2f	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	e2aadf34bf15ba78ac925eb4de594ab87326d6aabd22c0cba6473af65c86e3b8	2026-07-16 16:48:16.041+00	t	2026-06-16 16:48:16.081838+00
caf75bd4-3a8a-4027-a4b6-c61289cbb2de	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	de6b4ce3edfc45aea77fc6da46ee9459f47610b1ea94fe1a1382eb0250d78cb3	2026-07-16 17:12:39.85+00	f	2026-06-16 17:12:39.89791+00
e63d9aa8-a5ed-4fe8-97c1-094ebba5f448	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	065e76f3307ef6df9c5349230af2cc47017cc5d1f93b13b37f1641cb058d4ee7	2026-07-16 17:12:39.853+00	f	2026-06-16 17:12:39.900694+00
70b26f18-0dd2-4c00-82a5-658f583cb72d	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	3e8ebe4dbeb554e843bf0d329eff9a35061a6d0b7e0f11b9f6a1a807b1ada465	2026-07-16 17:33:56.204+00	t	2026-06-16 17:33:56.249241+00
97d0f7f9-b178-4c47-b121-94a396881f43	359c2691-3c08-43e6-9a70-4f3d1c33a764	fef753ee798f8fdde7c948aa6f3f662f28d0069a27b3fefecfb616dfe3abc635	2026-07-16 17:52:24.108+00	f	2026-06-16 17:52:24.115803+00
c3aaeb7b-fb3a-48a9-aed2-d58cf903aba4	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	fcc12797fd4ea75a00c4dcbd23b8d2bdf70a97b9048b3a7d3fbcda330333eb22	2026-07-16 17:34:56.263+00	t	2026-06-16 17:34:56.26981+00
76eef10e-ddef-4ff1-b4cb-b5d1ec4dfed6	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	1cbb4bc282ec1710b4f766f63151c9325704097a364e1b9b055604bc4fc074e4	2026-07-16 20:16:01.609+00	f	2026-06-16 20:16:01.651185+00
629a61ee-fa4f-4b40-b371-fadefcbdd989	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	bd2519fa13272ec57ee8c069b863dbdd5ade2ef28aa15084722844aff178a5bf	2026-07-16 17:49:18.623+00	t	2026-06-16 17:49:18.662898+00
59e6a0d7-b9ab-40c4-bbb1-f1c3d5780341	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	86a046b25be2e37d991dd944c2d54873b239534e2e344ca05706fdbb472e7104	2026-07-16 18:10:28.932+00	f	2026-06-16 18:10:28.973906+00
71eb6a53-4b9a-469f-a27c-cc0d920388ec	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	283805b8b3b40deb90c3f3e7db4f2df0fe12306493bb70edf01f66aa32f94cb5	2026-07-16 18:10:28.932+00	f	2026-06-16 18:10:28.976271+00
b4208e16-5c08-42b5-a440-db32415b98c5	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	80cac8a2eee82a9eb8b80ef5c7c76d18abc46cf491cfedf59f718f3bcd84c3b4	2026-07-16 18:10:28.932+00	f	2026-06-16 18:10:28.974128+00
3f2d474c-4b65-4607-a8eb-ce6dec3b9ec3	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	8e50a25c48936ad74ff20f12611dd3a42cf7740d76155ae49eb7642074a7791c	2026-07-16 20:28:33.393+00	f	2026-06-16 20:28:33.400577+00
42d0681b-60bb-4cb3-82fe-acc5d0fc7b7a	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	3df427a094011785ee6f1917649f4c539e2d757b68e3ccacd21ccf2da40b989b	2026-07-16 09:11:36.944+00	t	2026-06-16 09:11:36.952653+00
497a308e-7b54-4c00-b12e-bd10502e7fff	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	be258a4d3a4e45aa8da967ba39e8869c27d10cc26109a6b4116f5c3f27a26bb4	2026-07-17 01:08:24.573+00	f	2026-06-17 01:08:24.622891+00
d973d841-84c1-4a7f-92e6-f84ab97848d7	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	feb8822b1944cd6eae31879060ea2cc49180e7cd3cd14f7246ef7989472257b3	2026-07-16 09:15:37.09+00	t	2026-06-16 09:15:37.137902+00
9b7ae236-1404-452f-9d94-faddad65d365	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	a8368f8ae3fbcdcca6f2238a5eecbeb52c4be07dfd2aa72ee402827f12f904e5	2026-07-17 02:29:37.992+00	f	2026-06-17 02:29:38.038586+00
e3e079fa-4951-46ca-9cb5-6e4b3a777a00	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	01127b849d21423f9ecbc1ce21f916fb9fade9358184df095993236d2ee31f4b	2026-07-17 01:09:02.916+00	t	2026-06-17 01:09:02.92278+00
7eb8dc61-4e67-4707-9e20-cca049cdf716	c20d4124-5651-4527-97f5-9ebb5052395d	63edb02dce162b46fd56f2ce08b817f77d9f6b7a0c1d8e83fc5839ae5e47133f	2026-07-16 09:30:27.197+00	t	2026-06-16 09:30:27.203986+00
872af371-6aa7-4ce5-81b2-202a7f2b1a6b	97911dcd-aa5d-4ec7-a349-9863dcd7d591	52c7cf4aa64a5f19be2e2f4977ac3d513168b45f9d78438715fb0233510698b8	2026-07-17 00:54:23.759+00	t	2026-06-17 00:54:23.76705+00
a82be43e-0e4e-46bf-a855-7190a3118e41	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	d662fc3f41e23ccf585c11d2e5ec6b0016ed90ae4b721940616f4dd8a638b63d	2026-07-16 18:10:29.632+00	t	2026-06-16 18:10:29.639364+00
62b886ef-ec24-4056-a712-24adefbb5546	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	e946e7a524ba3d5e5fbeb42e95a8903babf34d32a2c74fccac3b344894ee2aae	2026-07-14 03:11:25.116+00	t	2026-06-14 03:11:25.164053+00
f6b4b038-ae0d-443d-a450-c3a32b93215c	e716ec9c-5eae-4737-823a-e05517d1979b	c164a293523d3b366faf42b493d697ce707d37c9f0b2c47168944baafde03f11	2026-07-13 12:00:14.892+00	t	2026-06-13 12:00:14.904084+00
eb09486d-157b-4843-a89f-bdf9994d6b65	e716ec9c-5eae-4737-823a-e05517d1979b	f1cecb6d82cad1762a8ffddd45088dab39135d4bb924d2725bc1b8dfa47c081f	2026-07-16 09:07:22.855+00	t	2026-06-16 09:07:22.861792+00
2078a13a-7558-484e-92c3-79507f0b8167	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	d16f5c0aaff4050ae82a88e03e292caa01abb0734f825c0630c39d8d3061f368	2026-07-17 02:29:39.668+00	t	2026-06-17 02:29:39.677142+00
4531740e-1576-414d-a323-a51a86dd7870	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	c357076e6f3243ca806ca5fc8619dc63edfe080e236396ead6840513d4886f30	2026-07-17 02:44:40.737+00	t	2026-06-17 02:44:40.779206+00
bb3536de-b97d-4759-9b59-6df0df7b768c	97911dcd-aa5d-4ec7-a349-9863dcd7d591	355340d0a35713c46318ef81cf362e6992abdcfcefbb314a1fbe845a9bd39c37	2026-07-17 02:54:22.821+00	t	2026-06-17 02:54:22.828094+00
806bca68-44e4-4c21-86b2-e8e9c74fd581	97911dcd-aa5d-4ec7-a349-9863dcd7d591	f28c57e16133907c0391c4a168e37d3cfbb83dcc902a7148860b24c79b7e5366	2026-07-17 03:12:46.354+00	f	2026-06-17 03:12:46.407165+00
fd1aa6d3-f8ce-4928-82b5-4f5bdacd94b8	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	dc67d4905df2b772d3a04a411bbb3428b5797407e43b9b5db759f53aa3446389	2026-07-17 03:14:53.251+00	f	2026-06-17 03:14:53.302793+00
34418a80-47f4-4d07-9c50-099160a06bbe	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	b98ba69149981a29441437548c19f5d5268f7521b61a1b678d312b808a76b026	2026-07-17 03:15:10.893+00	f	2026-06-17 03:15:10.904319+00
0de4cbde-e138-44e8-8e3f-8e1d41efffa3	c20d4124-5651-4527-97f5-9ebb5052395d	9653adbd4238902b6d89581897f5d362cec8980a81137c600680a66dde024df7	2026-07-17 03:25:02.624+00	f	2026-06-17 03:25:02.662939+00
cb2dcdb6-e506-46b1-b0b8-1cae2c34c690	97911dcd-aa5d-4ec7-a349-9863dcd7d591	35bd5d9898d57956e29782582c37a89cb94d50264b9807c8d88cd66639250d05	2026-07-17 03:34:44.224+00	f	2026-06-17 03:34:44.232868+00
da9ced01-2459-42b6-ad42-27c183c369d3	97911dcd-aa5d-4ec7-a349-9863dcd7d591	8cf511bbe4a05b82d03334f0188c317b1c0250b703b1c4db8ca8a744d6b035d7	2026-07-17 03:35:13.869+00	f	2026-06-17 03:35:13.876449+00
6c862d59-89b5-47ee-86e6-7b92a3759d89	97911dcd-aa5d-4ec7-a349-9863dcd7d591	54ce30f574e0942882956f3ed5865528fdd078913488cd5b972be0c6683da788	2026-07-17 03:35:39.496+00	f	2026-06-17 03:35:39.50359+00
f4f33e37-d872-4dca-8433-af9589366541	97911dcd-aa5d-4ec7-a349-9863dcd7d591	9e9b31aab42a09d809c56e6f02d4089a1288353e32d32cbdf8638e857b0f8027	2026-07-17 03:35:43.752+00	f	2026-06-17 03:35:43.759706+00
4ee8ab26-58dc-4289-83cc-bd0b0fd8f2d4	97911dcd-aa5d-4ec7-a349-9863dcd7d591	4f7286816348e40bf6440f372196bff620638889614e8ea6fa9c4624c371db8e	2026-07-17 03:35:59.419+00	f	2026-06-17 03:35:59.427114+00
0db41cf8-816f-4147-b24c-deb9c5650871	97911dcd-aa5d-4ec7-a349-9863dcd7d591	98b72bd0a5bcd6e712668d965b08aea7d1340314f9cad568ab3fff497e38186c	2026-07-17 03:36:07.49+00	f	2026-06-17 03:36:07.497905+00
773bddb7-4f79-4ea1-8589-7dfe8dfed5c1	97911dcd-aa5d-4ec7-a349-9863dcd7d591	1c8f897a12ddaea1ab749609bfcd925cfd15a9a1fea1c935e0c17b8dc3fd7a5c	2026-07-17 03:36:33.726+00	f	2026-06-17 03:36:33.733594+00
31a479c5-c0a4-4319-a98d-64f8889acbf7	97911dcd-aa5d-4ec7-a349-9863dcd7d591	1ce253641a2651ede104eb96a418073c5d564aa18814ec8df95b9efdc511b0ef	2026-07-17 03:36:43.954+00	f	2026-06-17 03:36:43.994718+00
7f3d8d42-04be-45b6-8f0f-201ec68a2506	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	c3b00ed0cbcd4d81e2313a8b87262124ad53329486069dbc2a5ed0de1ded783e	2026-07-17 03:21:42.284+00	t	2026-06-17 03:21:42.292535+00
dd3fbc04-68c1-408b-8300-7c24325a6411	e716ec9c-5eae-4737-823a-e05517d1979b	5d3c749f4662c806f31ae925f6953db138959c2a9f621f7464e188f3b40f1e48	2026-07-19 10:15:21.637+00	f	2026-06-19 10:15:21.680663+00
93585bbc-612c-4752-9f99-a123cfa70bae	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	14c8cc278a5f27b072ff8b799bb80042361b1839ffa4fc648ca75a603f933892	2026-07-17 03:38:00.499+00	t	2026-06-17 03:38:00.541366+00
c454786c-f770-46f6-b46e-96565f1ba9e5	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	8f67afebb1d694e99b1eaca5232a1bd16a78bc1b701cdf9c394ee29478f0ac0d	2026-07-17 03:54:16.765+00	f	2026-06-17 03:54:16.802901+00
ae3bcd3b-848e-451c-be2a-13bb594e7092	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	20bb9248b746ff84e4dc7894f7f12e7c69a0d74f50108bae419218645e4c5e81	2026-07-17 03:54:16.774+00	f	2026-06-17 03:54:16.82076+00
a063a3f6-36fd-40c0-8053-b66ed035a018	97911dcd-aa5d-4ec7-a349-9863dcd7d591	43353a04adc14e760be6f3a7cba0a8c53a085a13dcfeee4423d6baa3b7aac8a3	2026-07-17 03:35:25.709+00	t	2026-06-17 03:35:25.716917+00
7538da2a-cef4-4fff-9bc1-1f3543e1728f	97911dcd-aa5d-4ec7-a349-9863dcd7d591	52ffec363e57c02f6b9e22fdc9e086907befd7cd888631a902db79efa7271e7c	2026-07-17 03:36:39.251+00	t	2026-06-17 03:36:39.259032+00
43565607-3729-45b9-a853-ad770006191c	97911dcd-aa5d-4ec7-a349-9863dcd7d591	992cdcedf673a1378650af2b82cb9625e801978c5b7f81d4e6cf874154c35782	2026-07-17 04:10:45.046+00	f	2026-06-17 04:10:45.089019+00
3fb31944-fc84-4769-93dd-fc3c9a952677	97911dcd-aa5d-4ec7-a349-9863dcd7d591	425bad1b4eef4417b150ba8f98c0b3859158cea20cc4b5a26a0f43ffbde0fe92	2026-07-17 04:10:45.059+00	f	2026-06-17 04:10:45.097415+00
d2b97fd3-fd0c-4e87-92fa-628489ec14bc	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	93db6e5a79b39145e316d807d15376b7714eea53a5d4a00ac506bdc7154ab6ac	2026-07-17 03:36:35.151+00	t	2026-06-17 03:36:35.158469+00
32b72c25-f225-49d9-81d3-369959c94ce9	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	2778e1717086874567be04b2010c911974fbe7a7f31b20160ca7fb76462bfffb	2026-07-17 06:30:52.389+00	f	2026-06-17 06:30:51.944447+00
0f309ecf-3258-4dc6-8f11-39ce7d8770af	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	77047c5b429eec3ed66885b6c4b9c2758f70e506abb41c7ddbd5b2f10b9fa992	2026-07-18 04:17:25.375+00	f	2026-06-18 04:17:25.443016+00
d0bea850-8c13-46c2-96d0-39dd0dbb4038	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	c6088e44c052d14b528c498820c99869cd774b223294e2a6f57884e266ce4c99	2026-07-18 13:38:55.891+00	t	2026-06-18 13:38:55.937563+00
c8504bb8-e799-437c-a442-d8f60d6e2a4d	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	268824e4ee19eb95f13c887c4237dba00dac923456715aa148edca2e54d9d3af	2026-07-18 14:10:15.677+00	t	2026-06-18 14:10:15.725447+00
8736ebc4-86fb-43af-b95d-abd078f89341	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	678338839c308367346f22d7bbea738e558e0cf0f97fdb81f70d8367762dcbfe	2026-07-18 14:10:15.982+00	f	2026-06-18 14:10:16.026898+00
00df32f5-c178-42e4-951d-2b557e7640b4	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	8fb95fc43069c5bd9e82d8fa41c06a8b4ecc35cdaba205e28cf163ea81d836f9	2026-07-17 03:00:00.219+00	t	2026-06-17 03:00:00.283326+00
995849f4-6f0b-4abe-9559-e23ce459f608	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	39c9f6075888025612080a78c8a38e46efa6d64f215db86eb6b30369ae5d1140	2026-07-19 02:27:27.066+00	f	2026-06-19 02:27:27.11713+00
101fe0c3-cd44-418c-8b93-6b5ab565b278	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	9c9c2bac0646c847e1a88d831e1f18e4b190f77cdb85954bbe2bd265daa838e3	2026-07-19 02:27:28.818+00	t	2026-06-19 02:27:28.827876+00
f262ff01-cbee-4f52-ba10-00fa6b1f597f	e716ec9c-5eae-4737-823a-e05517d1979b	fc8e8db60dbb6cfe258b9fc76bd5584881504288fffead452a4ed064f4db6463	2026-07-19 10:16:00.026+00	f	2026-06-19 10:16:00.035338+00
97292faa-023b-45d9-a8fb-87465836bd8c	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	cc0dc3f9f4fc4e18b813d156c17fb3d8c881b664e26644a5d50115b333d466a8	2026-07-19 02:43:04.601+00	t	2026-06-19 02:43:04.648751+00
06593ed1-9d6f-46e8-83f6-d4f2a17a244e	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	a702969f69afe1b617852236c79701aca7a1d832e622b0a40fc066668a03ebf2	2026-07-19 02:58:05.922+00	f	2026-06-19 02:58:05.962361+00
fedc357b-03ad-4d98-a97a-ecefac98f215	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	50a56fbd07983843d55f0f1fef333fc1763aeeebf534543413f950afe28195be	2026-07-19 02:58:05.921+00	f	2026-06-19 02:58:05.964609+00
c19ee91d-6bf9-4848-be94-9421710770e2	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	d7e81cce65dda59b42a4a83b6ad16b23e28ba2958cd8d8fae5fbd8fe42b5534f	2026-07-19 02:58:05.922+00	t	2026-06-19 02:58:05.965345+00
0b924552-3015-4ea0-9a13-18d44d2f2096	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	39b7903e9d0580629ab4ca8ee172ea8c52a094e58bc3a2378f9e8aed3e39c6b1	2026-07-19 03:14:02.489+00	t	2026-06-19 03:14:02.538799+00
6b93f250-d2c7-4b23-8063-b15548253797	b942e05c-7962-4930-828d-64eecab26546	db3238f036745281cc7cc26129bca4daecc353e092c3a5662988867ef6daf074	2026-07-19 03:44:42.417+00	f	2026-06-19 03:44:42.424097+00
12def9f8-16a3-4ecf-a198-912b09488387	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	a1411cad4251066a0e5b2e49266e5cb90faabd3b7be321d961cc5104ed373c5c	2026-07-19 03:29:41.242+00	t	2026-06-19 03:29:41.288908+00
eb866f7a-fdc1-4bc1-b1da-49f32875475b	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	f9415307e2a4481a0905113bc56bf1b90ef20041d9e54942d04d37622ac52e60	2026-07-19 03:45:48.521+00	f	2026-06-19 03:45:48.563914+00
925b8759-afbc-46eb-86cf-0a9c4cb50034	69daf2e3-4f9a-4f60-b1e0-8ca195c35129	a5904beae1d79e4a2dc81368803c018259baadb3a0c4f63584f72bbd768c500d	2026-07-19 03:49:28.845+00	f	2026-06-19 03:49:28.853702+00
4fe2b5f6-9ed9-402e-b22f-dc47869f38fc	277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	12a9ef958f99c42875eb1fbe10838869fcd34b361de8cf4c4eacac30c14bdfbe	2026-07-19 10:26:33.402+00	f	2026-06-19 10:26:33.41007+00
cfe4c67c-c39b-4ff9-8e0a-87398f1ddc00	d4124f11-97fc-41dc-a4f0-e010a552cdf1	9a2194f7ad0b437225899a522a03ae0a128f7d9d80ae6cfd55c66062b44074b7	2026-07-18 14:09:51.041+00	t	2026-06-18 14:09:51.050919+00
1a53e0df-a145-4252-a59f-90982ac028e6	d4124f11-97fc-41dc-a4f0-e010a552cdf1	d4ff4be1f2d24581c9e8200b0c2438cdf64cf9a0958ff93b2574edbe9554a247	2026-07-19 10:33:48.846+00	f	2026-06-19 10:33:48.886767+00
73dbede4-6c18-4ac3-9a6a-39f9a5b028a2	e716ec9c-5eae-4737-823a-e05517d1979b	3e488f852b83a134348cf8e553f906c80f59e5bd0e377cf0b37915edee437fbf	2026-07-19 10:41:34.131+00	f	2026-06-19 10:41:34.139703+00
0589c5c3-6635-47c4-bde7-cb1b40349a9f	e716ec9c-5eae-4737-823a-e05517d1979b	a3ccc69308ec34712c3ac6bcc80ac24e0350a125045932bc02d31355b25aa5fd	2026-07-19 10:55:44.954+00	f	2026-06-19 10:55:44.995342+00
fd1a6cc0-2524-40ef-8aa5-e4243d496d84	e716ec9c-5eae-4737-823a-e05517d1979b	1d8c108ac4b55475f8b8e9d83a090299ee15c3405edabaa82a4a78819e820e6c	2026-07-19 10:55:55.29+00	f	2026-06-19 10:55:55.297648+00
6ad42e09-49e8-41db-af38-48a883abc054	e716ec9c-5eae-4737-823a-e05517d1979b	fbe0a0cde480bf8137d7cd9535bc0577c96d77278ceee588c1d4963740dddaed	2026-07-19 10:53:56.008+00	t	2026-06-19 10:53:56.017332+00
cbbabc02-20d7-4cab-81fe-b039abbce1bf	e716ec9c-5eae-4737-823a-e05517d1979b	74f0bec0a65e7d0886da56021ac08f6d511d9564238dff04a298e7e0df540b28	2026-07-19 11:35:15.511+00	f	2026-06-19 11:35:15.554909+00
\.


--
-- Data for Name: retentions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.retentions (id, company_id, unit_id, due_date, status, notes, created_at, updated_at, link_foto_360, photo_before_url, photo_after_url) FROM stdin;
670a2a8d-ab64-46d8-83bb-c67ed263dba4	4f7ed319-636f-4c74-83df-a823408f0a04	d5b81b38-2c45-44de-8304-0088725f8008	2026-09-25 00:00:00	active		2026-06-17 03:43:40.479042	2026-06-17 03:43:40.479042	\N	\N	\N
\.


--
-- Data for Name: ticket_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ticket_messages (id, ticket_id, sender_id, message, attachment_url, created_at) FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.tickets (id, assignment_id, customer_id, subject, status, priority, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: timelines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.timelines (id, company_id, project_id, unit_id, task_name, start_date, end_date, status, created_at, updated_at) FROM stdin;
8515ab3e-9649-4a07-b008-69351cdfe030	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	fcf8ed60-151e-4569-9128-ad9287d3658c	Fase Pondasi	2026-06-20 00:00:00	2026-06-30 00:00:00	planned	2026-06-16 17:48:27.142282	2026-06-16 17:48:27.142282
46bf2b05-52d7-4016-9ebf-a767423d7a26	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	fcf8ed60-151e-4569-9128-ad9287d3658c	Fase Dinding	2026-07-01 00:00:00	2026-07-10 00:00:00	planned	2026-06-16 17:48:51.236174	2026-06-16 17:48:51.236174
c73b7b28-6d32-4861-b444-ce5edaa5326d	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	fcf8ed60-151e-4569-9128-ad9287d3658c	Fase Atap	2026-07-11 00:00:00	2026-06-20 00:00:00	planned	2026-06-16 17:49:19.023266	2026-06-16 17:49:19.023266
2d664c3f-fccb-47b2-b152-11482d7500a5	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	fcf8ed60-151e-4569-9128-ad9287d3658c	Fase Finishing	2026-08-01 00:00:00	2026-08-10 00:00:00	planned	2026-06-16 17:49:45.832517	2026-06-16 17:49:45.832517
c585b8e6-8008-47e2-ae60-326a9a6bb763	4f7ed319-636f-4c74-83df-a823408f0a04	32d7e8f7-e85a-4404-ada4-0783b6a4d3aa	b4440a65-65ab-4388-8355-53b7d09d3795	Finishing	2026-02-01 00:00:00	2026-06-01 00:00:00	completed	2026-06-17 02:32:15.868737	2026-06-17 02:32:41.35
40188912-8377-49f8-bad0-124c2c06bb56	4f7ed319-636f-4c74-83df-a823408f0a04	13dc0008-4bea-45e1-86bb-3d390b19be50	9bad6517-b817-498b-ac3a-fce73ee4f334	Tahap Bangun	2026-06-14 00:00:00	2026-10-14 00:00:00	on_progress	2026-06-14 03:07:30.562679	2026-06-14 03:07:30.562679
04bef70a-c351-47f7-8180-de3e8a5d3241	4f7ed319-636f-4c74-83df-a823408f0a04	13dc0008-4bea-45e1-86bb-3d390b19be50	4a624625-8098-47c1-a8b6-5af3072c7df1	bangun	2026-06-18 00:00:00	2026-06-25 00:00:00	on_progress	2026-06-18 14:11:12.641368	2026-06-18 14:11:12.641368
dfe3a0bc-661a-4f23-9de5-1a3394cf651e	4f7ed319-636f-4c74-83df-a823408f0a04	32d7e8f7-e85a-4404-ada4-0783b6a4d3aa	d5b81b38-2c45-44de-8304-0088725f8008	dinding	2026-05-11 00:00:00	2026-05-18 00:00:00	completed	2026-06-16 09:13:35.770348	2026-06-16 09:13:35.770348
e8b9a63e-235e-486f-8744-5858c4e3521c	4f7ed319-636f-4c74-83df-a823408f0a04	32d7e8f7-e85a-4404-ada4-0783b6a4d3aa	d5b81b38-2c45-44de-8304-0088725f8008	Pondasi	2026-05-02 00:00:00	2026-05-08 00:00:00	completed	2026-06-16 09:13:03.375889	2026-06-16 09:13:55.133
8e04f529-ca35-4da5-aa6b-23ccaa276a6a	4f7ed319-636f-4c74-83df-a823408f0a04	32d7e8f7-e85a-4404-ada4-0783b6a4d3aa	d5b81b38-2c45-44de-8304-0088725f8008	Atap	2026-05-18 00:00:00	2026-05-20 00:00:00	completed	2026-06-16 09:15:37.306058	2026-06-16 09:15:37.306058
3a92ba03-1276-456d-badd-1a5a606fcb8c	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	62359290-f8a8-4349-9939-55168b219d84	Finish	2024-11-04 00:00:00	2025-10-07 00:00:00	completed	2026-06-19 02:56:16.213718	2026-06-19 03:02:49.725
2bec6edc-0c74-4910-8f50-49c796fcae62	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Kloset - Shower	2026-06-19 00:00:00	2026-06-19 00:00:00	planned	2026-06-19 03:16:47.98101	2026-06-19 03:16:47.98101
e0d90ba0-3adf-4ca2-bd45-aa190642107d	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Kusen - Pintu - Jendela	2026-06-19 00:00:00	2026-06-19 00:00:00	planned	2026-06-19 03:17:10.780421	2026-06-19 03:17:10.780421
a1f05fc3-78df-488c-a9db-5d60d0139ec7	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Finishing	2026-06-19 00:00:00	2026-06-19 00:00:00	planned	2026-06-19 03:17:24.949303	2026-06-19 03:17:24.949303
0eea52d4-eb8a-437d-9f63-58935614d63e	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Pondasi	2025-12-22 00:00:00	2026-01-02 00:00:00	completed	2026-06-19 03:14:15.071267	2026-06-19 03:20:10.841
ac4383aa-0af6-48d6-9e5e-24a2fb68eba4	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Dak Cor	2026-02-03 00:00:00	2026-02-08 00:00:00	completed	2026-06-19 03:14:42.636282	2026-06-19 03:21:49.835
ee4784d1-b0c1-4d06-a55f-dc539e48b600	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Atap	2026-03-26 00:00:00	2026-04-16 00:00:00	completed	2026-06-19 03:15:09.198104	2026-06-19 03:25:45.76
e23c2005-ff88-4739-9d69-a603c8fa7c77	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Plester - Aci - Plamir	2026-04-13 00:00:00	2026-06-15 00:00:00	completed	2026-06-19 03:15:20.727954	2026-06-19 03:28:30.696
b82f1a83-683e-45bd-8b5c-85ea0222f273	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Pemasangan Granit	2026-06-16 00:00:00	2026-07-11 00:00:00	on_progress	2026-06-19 03:16:04.269895	2026-06-19 03:29:41.458
438c33b4-0d76-46f7-bf64-260b4d6a4802	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Pasangan Bata Lantai 1	2026-01-03 00:00:00	2026-02-02 00:00:00	completed	2026-06-19 03:14:29.563755	2026-06-19 03:31:49.747
ad71b169-ea2e-4bbb-ae65-53ca17c7b759	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Pasangan Bata Lantai 2	2026-02-09 00:00:00	2026-03-25 00:00:00	completed	2026-06-19 03:15:00.642505	2026-06-19 03:32:06.014
2e56a31c-c431-46a2-b68c-51bd46166dc2	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Elektrical	2026-06-19 00:00:00	2026-06-19 00:00:00	planned	2026-06-19 03:58:58.16034	2026-06-19 03:58:58.16034
5df806a3-a7a7-40c1-b56a-1db38bf599a8	4f7ed319-636f-4c74-83df-a823408f0a04	ada94a37-33ab-4b42-acf7-e7c50e139805	254fc2f7-1231-4172-af3e-39000f79eb0d	Plumbing	2026-06-19 00:00:00	2026-06-19 00:00:00	planned	2026-06-19 03:59:13.404348	2026-06-19 03:59:13.404348
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.units (id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, created_at, updated_at, image_url) FROM stdin;
9bad6517-b817-498b-ac3a-fce73ee4f334	e34deca2-1730-4b72-9537-202596d70ca8	Demo 01	40	50.00	40.00	belum_mulai	0	2026-06-14 03:01:38.563898+00	2026-06-17 03:25:31.63472+00	https://assets.podorukuntrack.com/1781666731003-55e71f8775797972.jpg
1c924f0d-f6e4-4c12-ae58-fd322ff676a9	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A2	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:34.820338+00	2026-06-16 09:00:34.820338+00	\N
83ee30ab-c700-4c4b-93c2-aa2d01164322	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A3	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:34.858426+00	2026-06-16 09:00:34.858426+00	\N
13c3bce1-1700-4a39-b320-fb2adea3878d	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A4	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:34.896639+00	2026-06-16 09:00:34.896639+00	\N
2b23cfb4-8bec-48c5-9cc9-18843c695594	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A5	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:34.935032+00	2026-06-16 09:00:34.935032+00	\N
870b8d67-b964-4c04-95d0-23a100c016d1	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A6	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:34.973582+00	2026-06-16 09:00:34.973582+00	\N
5841b6b1-be8d-4f7c-b571-4635be7dc916	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A7	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.010899+00	2026-06-16 09:00:35.010899+00	\N
c7e8ed79-1be2-4197-947d-42c8f7e6e98a	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A8	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.046635+00	2026-06-16 09:00:35.046635+00	\N
0828542e-b0e5-4f76-aea5-5a44cfde9755	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A9	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.081977+00	2026-06-16 09:00:35.081977+00	\N
8a64c9f2-4d6f-4047-b8b3-aa8f054b4ce9	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A11	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.152374+00	2026-06-16 09:00:35.152374+00	\N
09b2ec60-d4f2-4d24-a053-9388f0374780	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A12	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.187604+00	2026-06-16 09:00:35.187604+00	\N
b73b72af-49c2-4d62-b153-a59540295312	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A12A	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.222744+00	2026-06-16 09:00:35.222744+00	\N
d1e4f532-166e-483d-ad2e-d5772dc45c33	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A15	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.258048+00	2026-06-16 09:00:35.258048+00	\N
443c34ad-3439-4507-8687-d323f6d12f7b	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A16	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.297615+00	2026-06-16 09:00:35.297615+00	\N
4bd60b52-c024-46a8-942c-318e9ed2e6ff	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A17	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.33301+00	2026-06-16 09:00:35.33301+00	\N
c813c458-2244-4d1c-8e73-6c5ee7eebdaa	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A18	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.368382+00	2026-06-16 09:00:35.368382+00	\N
6f3eca00-f84d-4a19-a526-ce242f2e2142	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A19	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.408139+00	2026-06-16 09:00:35.408139+00	\N
db5ecf3b-6242-421a-baa4-46c8a0887514	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A20	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.443861+00	2026-06-16 09:00:35.443861+00	\N
dc1e4f3f-8cf3-4ef5-9b8c-b35d116e6f40	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A21	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.479122+00	2026-06-16 09:00:35.479122+00	\N
71080960-e5fc-450d-8b5b-e2d5c6349fee	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A22	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.514651+00	2026-06-16 09:00:35.514651+00	\N
664a552c-8cb2-4f6e-a975-92f589f35339	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A23	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.549842+00	2026-06-16 09:00:35.549842+00	\N
8112be21-0f9b-458e-8716-f8aa471dc625	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A24	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.584998+00	2026-06-16 09:00:35.584998+00	\N
c6f998f6-77c9-4b81-af1e-093a7115af81	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A25	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.620683+00	2026-06-16 09:00:35.620683+00	\N
5cae1860-ec38-4f23-89f3-8cf956f382f1	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A26	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.656056+00	2026-06-16 09:00:35.656056+00	\N
96a97f60-512c-432b-a12c-60319b700d7b	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A27	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.691185+00	2026-06-16 09:00:35.691185+00	\N
36d31b7e-280e-42e7-af70-c0012262618b	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A28	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.726676+00	2026-06-16 09:00:35.726676+00	\N
c82f7d89-5728-4a30-a0b8-35ed59884ece	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A29	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.761918+00	2026-06-16 09:00:35.761918+00	\N
90986e47-3aad-4871-abee-26b8ca4cf221	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A30	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.796922+00	2026-06-16 09:00:35.796922+00	\N
cd308826-fcce-458e-8076-ef501b9127e1	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A31	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.832349+00	2026-06-16 09:00:35.832349+00	\N
ebe7119f-4e96-42eb-afeb-5ca94fef40de	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A34	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.867555+00	2026-06-16 09:00:35.867555+00	\N
95fcd113-7418-4d6e-8f57-12ac7c61bb1a	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A35	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.902883+00	2026-06-16 09:00:35.902883+00	\N
2a9716d3-7237-47da-9da4-315551df69d1	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A36	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.93814+00	2026-06-16 09:00:35.93814+00	\N
3968eda2-50c3-4785-8146-58e9c135b7b5	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A37	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:35.973542+00	2026-06-16 09:00:35.973542+00	\N
1f4ac886-29b8-461e-b4fb-b70c05d37680	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A38	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.008861+00	2026-06-16 09:00:36.008861+00	\N
9bb439b5-d74a-4a29-8283-353a733dc638	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A39	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.044176+00	2026-06-16 09:00:36.044176+00	\N
f2caebc4-2f6c-43c8-adfb-52ed4e59cf1d	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A40	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.079746+00	2026-06-16 09:00:36.079746+00	\N
a94bde6b-04da-4f26-a2cb-e5d1278fdfc7	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A41	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.115297+00	2026-06-16 09:00:36.115297+00	\N
50e17b1d-46f8-4d5a-b74b-17e37dfc2281	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A42	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.150484+00	2026-06-16 09:00:36.150484+00	\N
1e5b7c22-6455-4a8a-b339-67d07296a84a	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A43	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.185794+00	2026-06-16 09:00:36.185794+00	\N
e1dc393d-a4bd-45eb-9abb-ababa9ceab0d	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A44	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.223936+00	2026-06-16 09:00:36.223936+00	\N
61c17d38-f144-4dc7-848f-9eeaf09fb58e	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A45	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.259512+00	2026-06-16 09:00:36.259512+00	\N
a241c1cf-53dc-4431-92c0-f3fc9549c62c	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A46	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.294806+00	2026-06-16 09:00:36.294806+00	\N
9217fe88-e8d4-4972-9861-f7ba8980b4aa	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A47	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.330006+00	2026-06-16 09:00:36.330006+00	\N
d1c21346-e962-4dfd-984e-a3a83bb7e234	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A48	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.365081+00	2026-06-16 09:00:36.365081+00	\N
86e29d20-a99d-44a3-9cb5-799dd6728745	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A49	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.400623+00	2026-06-16 09:00:36.400623+00	\N
416713d9-980f-446e-ae3f-77a2d21f5b7a	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A50	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.435963+00	2026-06-16 09:00:36.435963+00	\N
fae0926c-7304-4897-8ca8-3d4874a97a29	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A51	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.471619+00	2026-06-16 09:00:36.471619+00	\N
d70e13f5-475c-4c93-a1a4-8afe61307859	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A52	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.506859+00	2026-06-16 09:00:36.506859+00	\N
cedc6ca1-7192-4a25-bde3-81ed26c27549	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A53	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.542077+00	2026-06-16 09:00:36.542077+00	\N
d460aec1-94a5-43e3-aaf4-4b372905f931	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A54	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.577093+00	2026-06-16 09:00:36.577093+00	\N
a70df5cf-a101-443a-b56a-a908a68c4112	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A55	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.612283+00	2026-06-16 09:00:36.612283+00	\N
257079bf-c563-45b8-b11d-056f509caba1	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A56	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.647407+00	2026-06-16 09:00:36.647407+00	\N
a152488c-ae7a-47f3-8e25-a55c4eca52da	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A57	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.682595+00	2026-06-16 09:00:36.682595+00	\N
e02615ac-cc21-40d5-813e-16c22e61f2de	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A58	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.717663+00	2026-06-16 09:00:36.717663+00	\N
6371088d-a8de-4b10-b619-355a70298511	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A59	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.752656+00	2026-06-16 09:00:36.752656+00	\N
4e09098b-e690-42e6-8e01-48023aff6ebb	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	Fasum	36	70.00	36.00	belum_mulai	0	2026-06-16 09:00:36.787794+00	2026-06-16 09:00:36.787794+00	\N
fcf8ed60-151e-4569-9128-ad9287d3658c	135ea701-d779-43f9-9b89-5da641ad68cd	Unit A3	50	70.00	50.00	belum_mulai	0	2026-06-16 17:19:48.789594+00	2026-06-16 17:49:45.897819+00	https://assets.podorukuntrack.com/1781630378777-720633000683c7d4.webp
d5b81b38-2c45-44de-8304-0088725f8008	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A10	36	70.00	36.00	selesai	100	2026-06-16 09:00:35.117199+00	2026-06-17 03:41:16.034191+00	https://assets.podorukuntrack.com/1781600712236-ee81c9f1d8e2f2e2.jpeg
b4440a65-65ab-4388-8355-53b7d09d3795	5ac7d7f9-5eb0-4a05-a267-c649f7f1bd32	A1	36	70.00	36.00	selesai	100	2026-06-16 09:00:34.767683+00	2026-06-17 02:33:58.926869+00	\N
62359290-f8a8-4349-9939-55168b219d84	135ea701-d779-43f9-9b89-5da641ad68cd	Unit A15	Tipe 65	60.00	65.00	selesai	100	2026-06-19 02:43:10.220071+00	2026-06-19 03:02:49.810124+00	https://assets.podorukuntrack.com/1781836984922-e9cd057911aa49da.jpeg
4a624625-8098-47c1-a8b6-5af3072c7df1	e34deca2-1730-4b72-9537-202596d70ca8	02	45	60.00	45.00	dalam_pembangunan	76	2026-06-18 13:40:45.291386+00	2026-06-19 10:42:09.003539+00	\N
254fc2f7-1231-4172-af3e-39000f79eb0d	135ea701-d779-43f9-9b89-5da641ad68cd	Unit A2	Tipe 75	78.00	75.00	dalam_pembangunan	51	2026-06-19 03:06:41.441456+00	2026-06-19 03:59:13.470235+00	https://assets.podorukuntrack.com/1781838843386-be019eb31ac00c90.jpeg
\.


--
-- Data for Name: user_devices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_devices (id, user_id, fcm_token, device_type, created_at, updated_at) FROM stdin;
3a9bc25d-c643-4068-babb-41fa46d4b5d6	97911dcd-aa5d-4ec7-a349-9863dcd7d591	ck5G_safSYym7Lh0_cdAV3:APA91bHauWvwMJQU75RMQV4YBvgf5GGppsVrxaF0sI-PRSqbZO1KXZ7YQ-3g55jc5gZGoVKPcuhgU1purgO_PZVVlMCnPetPTbQMuA1N1Df4ZElkOzWm0mA	android	2026-06-16 09:30:27.519263	2026-06-17 04:12:20.796
ed47285c-4690-40db-b79d-32900d91a4c8	97911dcd-aa5d-4ec7-a349-9863dcd7d591	dxzyZmZ7RKWnj53M9qHgP7:APA91bHOSe2F5U5ZiXMxDfounqhd_c6a-6evYTacZzBfHZQaK8i4-YTCK1PAW_CUL8TNQgfIxEVRrGPzlhM3IgS1aC9HSIEfUhfrCoZaCoJrRgHUAW9ydFw	android	2026-06-14 03:02:20.514671	2026-06-14 03:12:27.715
720fdb68-a794-46e8-9325-bbacb6e59480	359c2691-3c08-43e6-9a70-4f3d1c33a764	enSi6GRyT6akPRLWueIvqB:APA91bG3JEPpfXHagoXSO0kCc3VuOvkdvmy2Bxq6xQBDweeJt5sOGcEJBVXhg-f9SvcdMEJhOyIn4IXhzRXOFqCbNElHaa37qP09QOtaEWHg4B9mJzUrk9w	android	2026-06-16 17:52:24.421378	2026-06-16 17:52:24.421378
5901a6ab-7529-4738-b1e0-1ef8f74d0580	97911dcd-aa5d-4ec7-a349-9863dcd7d591	cvZ7GIwnQl2L-j5_wl8lNQ:APA91bHK6L8CdHoToxHvSRzwOOaOWNujoe-VBjK8YDrlAhTgIlbWLE_9USbt_NVrEwdYDy0gDR4U_-jPu9x6OgbqS02WFARXvBvLTMmO-tjbWn6g8AXUG8M	android	2026-06-17 00:54:24.158909	2026-06-17 00:54:24.158909
6004743b-1717-48d4-b144-f7a12fcfb605	d4124f11-97fc-41dc-a4f0-e010a552cdf1	dUIOqnrlT7CKYxzQVsIjyj:APA91bHEzzG3DWInhg1FBmSROUJ1FCsy8anQ_SvdsjUare3Se5tIZmqOhRq2NGDBG03GuibMx6-8vdmHz5j2lgm13uvibIJsFCnMW3eltiq9e1hB6DDX8es	android	2026-06-17 02:54:24.698686	2026-06-18 14:09:52.014
721edf53-d036-4322-89bc-31c0e8edd7e5	97911dcd-aa5d-4ec7-a349-9863dcd7d591	cIk4_SV0RY-Xo1TqW2ZG4G:APA91bH8YwTkLF_elKbuj8WRCyXtx_jo5FoKClebT7sZWCtm8UJUzWTd_LFVuAqs5W_9Whcmpz9w6tKeWvND8I9Lw545tiW8Nrk2c4JXGwuyTc-Cv0Er5DY	android	2026-06-17 03:35:15.373711	2026-06-17 03:35:15.373711
3d740ffe-022b-431e-8f14-9a14a52e00dd	b942e05c-7962-4930-828d-64eecab26546	ctVwDDlZT4C4yi_cexqYEk:APA91bE-XVY9qjan24vJmURG04CqqlwdlL9gXeepsAHNKresazktzWCxfTl2w52hJW2CHxyeT1bSOSmkEs00jpAC5plliytmnDvjcq-uUhBhcQNws5rCQcY	android	2026-06-15 12:29:09.592258	2026-06-19 03:44:42.678
bd2faa9f-377c-47d4-bf55-f7b27bc8f841	97911dcd-aa5d-4ec7-a349-9863dcd7d591	cGOcuch2RpyuuNn8UI-fd0:APA91bGN-hwY_CRoKrAZm14tSfySaT1qhE2KMa3CqY18lRiwshk5gzMCJubzLPw-HtqJ4n7tVCnbPqt2DDThTalLxI48u2M5e3DVvx-s2oe8Q2Pd-kbDG1o	android	2026-06-17 03:35:44.197594	2026-06-17 03:35:44.197594
0839b1f5-8620-4f13-8757-c3e49ce2cf27	97911dcd-aa5d-4ec7-a349-9863dcd7d591	fP4FhRKrTAOZOWDT-R0xDx:APA91bH7ckWW2unh3AgMJQpybDOjT2MNNX5gTzmqJSYwNY7DrnaBDF_3XzbSzxyipXgfFHcBBI1LHIbrfUWt57Dfxmc7JlCN93MzmVknpr2uZOCpnbufzhk	android	2026-06-17 03:35:59.70635	2026-06-17 03:35:59.70635
0ed4b4fe-9d65-4853-b223-0fbbecea8655	97911dcd-aa5d-4ec7-a349-9863dcd7d591	cZVi_7jqRQqjjqdiwifCrU:APA91bFuB_m7jJGlWB3BNzTc_mJPmKXnDi4P_abT5XvklK0FGzWWvqDpd8_zWXY_SEmvGcGRuGhZPJ81bPgbzSJXsMbTZhjYS2XC2lbKgDmj28eyB_IvmqI	android	2026-06-17 03:36:07.74606	2026-06-17 03:36:07.74606
3be28748-213d-4376-9bec-6516bff587fc	97911dcd-aa5d-4ec7-a349-9863dcd7d591	dUG0QExZSfGvtXOHTrMDF7:APA91bFpDHcgh88WxjRHyRc6capD2upE7vEq4ji7WGJ6nVBbPcfUUSwEPxLWJrCOgbtBC4DfSWH3y3I0T5f_8Y5sbuBtczFpty8JAEtR5RlxaFnAC4UkUQk	android	2026-06-17 03:36:34.001799	2026-06-17 03:36:34.001799
6b38da21-108f-4ffe-87c7-f9c8a8cc1da6	97911dcd-aa5d-4ec7-a349-9863dcd7d591	euWemJBkQTeX7bqqRiAptK:APA91bGbqaDJ_dB4494WKjCO95MjxicqlccYx5_1dYNrekl0vnVEMACHGlJ6tiQAulkxazHPjnxmbkSs5Hi5-VwSffjWhT9LJNK3Rfin2_wOHAvVSb4sJRE	android	2026-06-17 03:35:26.00412	2026-06-17 04:10:45.513
58a01489-348a-426c-8133-c6dcc57975ce	69daf2e3-4f9a-4f60-b1e0-8ca195c35129	eb2WQ8OpRo6nZowxiowq2F:APA91bHEo6RT3GM9_Uy3gPvzaO7MdDjdq8xXZgPycjitYQlo1VA4hbLVbf7HST0RXl1P3ByCi3tO9D-UIkQIrNFmhdEK4oRUlqYcA5PAJ6guzVB-gNlZNCI	android	2026-06-19 03:49:29.645694	2026-06-19 03:49:41.482
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, company_id, nama, email, password_hash, nomor_telepon, role, status, wa_notifications_enabled, last_login_at, created_at, updated_at) FROM stdin;
e716ec9c-5eae-4737-823a-e05517d1979b	\N	super admin	super@admin.id	$2b$10$i2NLrbCNL1DID77ghrrNmOifRxnj0hNqP7h/FfA64ygQOx6zKTAjy	\N	super_admin	active	t	\N	2026-05-19 09:34:55.01975+00	2026-05-19 09:34:55.01975+00
277bc23e-eddd-4b6d-adbf-1f3c3384f9b6	4f7ed319-636f-4c74-83df-a823408f0a04	Salsa CS	admin@prjp.com	$2b$10$/gCpXQGHKfTGDDnpdh/In.RShKilkj6b0saaKKlkyseLd5VWa5p7u	081325277775	admin	active	t	\N	2026-05-19 09:40:01.947583+00	2026-05-20 07:42:51.700724+00
c7e97843-8ca6-4cd3-acbf-e430d347bab8	2e50c6ee-4039-4e3a-b751-99cdc934c14d	Admin PRN	admin@prn.com	$2b$10$rJ5l42AdrcGNNgooBQtwTOBawc8qWHWrc2/IFEeZdz4qqctc2TJ5K	081252222889	admin	active	t	\N	2026-05-26 04:43:22.047241+00	2026-05-26 04:43:31.772493+00
97911dcd-aa5d-4ec7-a349-9863dcd7d591	\N	Demo 01	demo@prjp.com	$2b$10$nWgDESAUcO3TWFEisCORgOLjiXbK.BR0cJmA2m3D3OPcU.gkl1i/O	082145678923	customer	active	t	\N	2026-06-14 02:59:14.979736+00	2026-06-14 02:59:14.979736+00
59f10904-c467-4f49-994f-0bdaf66abecb	255a2048-be78-42a4-9b57-24a39cf9573a	Okta CS	admin@psm.com	$2b$10$gQPPZgCNFxn95r.Ao0u.R.5VzG6jct3Ml0wzOnTJiVYFyyVFidI8q	082221677986	admin	active	t	\N	2026-05-19 12:03:03.666038+00	2026-06-15 12:46:22.489575+00
a28bbe77-0eca-4376-946d-04ddf90ceb76	\N	fauzi	admin@prjp.com	$2b$10$Bitb9HOFPMEp8moQ.Hi5HuLAqN/N3Uum4Pb.3QKNWoJx87GZOi/pa		customer	active	t	\N	2026-06-16 09:09:43.2021+00	2026-06-16 09:09:43.2021+00
10096566-e768-4940-976e-333c4ccd6502	\N	fauzi	fauzi@prjp.com	$2b$10$VwNXVtU3hlV3EkMojIUFkuQwkVzoWr3ry8uiAO9f2b7f9rQhxLvMq	082121212121	customer	active	t	\N	2026-06-16 09:10:19.467173+00	2026-06-16 09:10:19.467173+00
c20d4124-5651-4527-97f5-9ebb5052395d	\N	Muhammad Faidz Agustiawan	faidzagustiawan@gmail.com	$2b$10$70CwZARFMJamA.8Qy9jpouOsYpV3Xl73oomrXtvSj8KcdgO8U5KzO	0895397133738	customer	active	t	\N	2026-06-16 09:12:53.218348+00	2026-06-16 09:12:53.218348+00
8f1d95eb-02e7-4681-900c-0baac153ebe1	\N	Demo 02	demo02@gmail.com	$2b$10$4L7wy5Pt2ZVhk2lxK7nH5e2hfPC.BEs1xrZ4vpeJVArQbW6S9/y62	0823547912637	customer	active	t	\N	2026-06-16 09:15:16.447258+00	2026-06-16 09:15:16.447258+00
359c2691-3c08-43e6-9a70-4f3d1c33a764	\N	Reza Pratama	rezapratamaakbar2195@gmail.com	$2b$10$VxXqsy7uReTPk4b.c9.NcuthFp/jItJSPSzTkrlz6KxIGCby0H8X.	\N	customer	active	t	\N	2026-06-16 17:52:24.073993+00	2026-06-16 17:52:24.073993+00
d4124f11-97fc-41dc-a4f0-e010a552cdf1	\N	Dama Saputra	damasaputra2005@gmail.com	$2b$10$dpkrX1HGfbp5X93pHfkUNO1FlWu7iajK1AmwHln771tINI32XubBK	\N	customer	active	t	\N	2026-06-18 14:09:51.00526+00	2026-06-18 14:09:51.00526+00
480a746a-dcb4-488e-b2f9-9aae12c1a625	\N	Syairosi	syairosi@gmail.com	$2b$10$9G1L9XzdMCnr/B6PlcpTrOPPrzKG7NmLDvz17WYSn78AkqXobpwhW	085858585858	customer	active	t	\N	2026-06-19 02:44:43.996769+00	2026-06-19 02:44:43.996769+00
b942e05c-7962-4930-828d-64eecab26546	\N	AMMAR KHALID	ammar@prjp.com	$2b$10$XGwjxPggLC7Z1D5Sxn6Od.mGsBSJAY1RkBDrwY2GGodN7qT0ui4K2	087878787878	customer	active	t	\N	2026-06-19 03:07:58.568443+00	2026-06-19 03:07:58.568443+00
69daf2e3-4f9a-4f60-b1e0-8ca195c35129	\N	shofiyuddin	hulluhalla@gmail.com	$2b$10$OT21B0sUUBg2kfI0wl1br.9cjwzkp349KQgjfLj8R0OoVe8VdaG5K	085233134400	customer	active	t	\N	2026-06-19 03:49:28.719059+00	2026-06-19 03:49:28.719059+00
\.


--
-- Data for Name: whatsapp_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.whatsapp_logs (id, user_id, nomor_tujuan, template_name, message_body, status, provider_message_id, response_payload, sent_at, created_at, company_id) FROM stdin;
675b3010-290d-454a-90af-439e2363febd	\N	0895397133738	\N	Halo Muhammad Faidz Agustiawan,\n\nKode OTP Lupa Password Anda adalah: *151259*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.	failed	\N	\N	\N	2026-06-13 12:01:39.7054+00	\N
4b41cba3-d9d0-4187-b1b0-222c93472803	\N	0895397133738	\N	Halo Muhammad Faidz Agustiawan,\n\nKode OTP Lupa Password Anda adalah: *810844*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.	failed	\N	\N	\N	2026-06-13 12:01:47.566761+00	\N
59d719d0-2f88-4df8-9314-a28a7f9d4fa4	\N	0895397133738	\N	Halo Muhammad Faidz Agustiawan,\n\nKode OTP Lupa Password Anda adalah: *572477*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.	failed	\N	\N	\N	2026-06-15 08:11:51.069147+00	\N
80809f5c-1577-4bfb-9b1d-5ba664e194f0	\N	0895397133738	\N	Halo Muhammad Faidz Agustiawan,\n\nKode OTP Lupa Password Anda adalah: *708559*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.	failed	\N	\N	\N	2026-06-15 08:17:36.618085+00	\N
8e35f407-1ee6-4c86-9b98-48e773633b5d	\N	0895397133738	\N	Halo Muhammad Faidz Agustiawan,\n\nKode OTP Lupa Password Anda adalah: *573845*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.	failed	\N	\N	\N	2026-06-15 08:19:35.007333+00	\N
d8f230c2-41bb-423b-8435-3fbedc613acc	\N	0895397133738	\N	Halo Muhammad Faidz Agustiawan,\n\nKode OTP Lupa Password Anda adalah: *321790*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.	failed	\N	\N	\N	2026-06-15 08:21:07.823129+00	\N
9d0b0e81-5de6-4011-a0ed-0a187fb80535	\N	62895397133738	\N	Halo Muhammad Faidz Agustiawan,\n\nKode OTP Lupa Password Anda adalah: *204954*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.	sent	\N	\N	\N	2026-06-15 08:24:43.885819+00	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: neondb_owner
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: clusters clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: construction_timelines construction_timelines_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.construction_timelines
    ADD CONSTRAINT construction_timelines_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages customer_ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT customer_ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: tickets customer_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT customer_tickets_pkey PRIMARY KEY (id);


--
-- Name: documentation documentation_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_pkey PRIMARY KEY (id);


--
-- Name: handover_defects handover_defects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.handover_defects
    ADD CONSTRAINT handover_defects_pkey PRIMARY KEY (id);


--
-- Name: handovers handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_pkey PRIMARY KEY (id);


--
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- Name: progress progress_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_pkey PRIMARY KEY (id);


--
-- Name: project_user_assignments project_user_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.project_user_assignments
    ADD CONSTRAINT project_user_assignments_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: property_assignments property_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: retentions retentions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.retentions
    ADD CONSTRAINT retentions_pkey PRIMARY KEY (id);


--
-- Name: timelines timelines_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_devices user_devices_fcm_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_fcm_token_key UNIQUE (fcm_token);


--
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_logs whatsapp_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_pkey PRIMARY KEY (id);


--
-- Name: clusters_project_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX clusters_project_idx ON public.clusters USING btree (project_id);


--
-- Name: defects_handover_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX defects_handover_idx ON public.handover_defects USING btree (handover_id);


--
-- Name: devices_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX devices_user_idx ON public.user_devices USING btree (user_id);


--
-- Name: docs_progress_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX docs_progress_idx ON public.documentation USING btree (progress_id);


--
-- Name: docs_unit_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX docs_unit_idx ON public.documentation USING btree (unit_id);


--
-- Name: handovers_company_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX handovers_company_idx ON public.handovers USING btree (company_id);


--
-- Name: handovers_unit_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX handovers_unit_idx ON public.handovers USING btree (unit_id);


--
-- Name: idx_assignments_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_assignments_user ON public.property_assignments USING btree (user_id);


--
-- Name: idx_clusters_project; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_clusters_project ON public.clusters USING btree (project_id);


--
-- Name: idx_docs_progress; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_docs_progress ON public.documentation USING btree (progress_id);


--
-- Name: idx_docs_unit; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_docs_unit ON public.documentation USING btree (unit_id);


--
-- Name: idx_payments_assignment; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_payments_assignment ON public.payment_history USING btree (assignment_id);


--
-- Name: idx_progress_unit_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_progress_unit_date ON public.progress USING btree (unit_id, tanggal_update DESC);


--
-- Name: idx_projects_company; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_projects_company ON public.projects USING btree (company_id);


--
-- Name: idx_tickets_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_tickets_customer ON public.tickets USING btree (customer_id);


--
-- Name: idx_unique_active_assignment; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_unique_active_assignment ON public.property_assignments USING btree (unit_id) WHERE (status_kepemilikan = 'active'::text);


--
-- Name: idx_units_cluster; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_units_cluster ON public.units USING btree (cluster_id);


--
-- Name: idx_users_company; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_company ON public.users USING btree (company_id);


--
-- Name: idx_whatsapp_logs_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_whatsapp_logs_user ON public.whatsapp_logs USING btree (user_id);


--
-- Name: progress_unit_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX progress_unit_idx ON public.progress USING btree (unit_id);


--
-- Name: projects_company_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX projects_company_idx ON public.projects USING btree (company_id);


--
-- Name: retentions_company_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX retentions_company_idx ON public.retentions USING btree (company_id);


--
-- Name: retentions_unit_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX retentions_unit_idx ON public.retentions USING btree (unit_id);


--
-- Name: rt_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX rt_user_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: timelines_company_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX timelines_company_idx ON public.timelines USING btree (company_id);


--
-- Name: timelines_project_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX timelines_project_idx ON public.timelines USING btree (project_id);


--
-- Name: timelines_unit_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX timelines_unit_idx ON public.timelines USING btree (unit_id);


--
-- Name: tm_ticket_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX tm_ticket_idx ON public.ticket_messages USING btree (ticket_id);


--
-- Name: units_cluster_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX units_cluster_idx ON public.units USING btree (cluster_id);


--
-- Name: user_devices_fcm_token_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX user_devices_fcm_token_idx ON public.user_devices USING btree (fcm_token);


--
-- Name: user_devices_id_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX user_devices_id_idx ON public.user_devices USING btree (id);


--
-- Name: users_company_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_company_idx ON public.users USING btree (company_id);


--
-- Name: wa_company_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX wa_company_idx ON public.whatsapp_logs USING btree (company_id);


--
-- Name: wa_user_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX wa_user_idx ON public.whatsapp_logs USING btree (user_id);


--
-- Name: clusters trg_clusters_updated_at; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trg_clusters_updated_at BEFORE UPDATE ON public.clusters FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: clusters clusters_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: construction_timelines construction_timelines_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.construction_timelines
    ADD CONSTRAINT construction_timelines_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: ticket_messages customer_ticket_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT customer_ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ticket_messages customer_ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT customer_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: tickets customer_tickets_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT customer_tickets_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.property_assignments(id) ON DELETE SET NULL;


--
-- Name: tickets customer_tickets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT customer_tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documentation documentation_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documentation documentation_progress_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_progress_id_fkey FOREIGN KEY (progress_id) REFERENCES public.progress(id) ON DELETE SET NULL;


--
-- Name: documentation documentation_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: handover_defects handover_defects_handover_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.handover_defects
    ADD CONSTRAINT handover_defects_handover_id_fkey FOREIGN KEY (handover_id) REFERENCES public.handovers(id);


--
-- Name: handovers handovers_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: handovers handovers_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: payment_history payment_history_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.property_assignments(id) ON DELETE CASCADE;


--
-- Name: payment_history payment_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: progress progress_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: progress progress_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.progress
    ADD CONSTRAINT progress_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: project_user_assignments project_user_assignments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.project_user_assignments
    ADD CONSTRAINT project_user_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_user_assignments project_user_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.project_user_assignments
    ADD CONSTRAINT project_user_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: property_assignments property_assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: property_assignments property_assignments_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE RESTRICT;


--
-- Name: property_assignments property_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.property_assignments
    ADD CONSTRAINT property_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: retentions retentions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.retentions
    ADD CONSTRAINT retentions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: retentions retentions_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.retentions
    ADD CONSTRAINT retentions_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: timelines timelines_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: timelines timelines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: timelines timelines_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.timelines
    ADD CONSTRAINT timelines_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: units units_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.clusters(id) ON DELETE CASCADE;


--
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: whatsapp_logs whatsapp_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: whatsapp_logs whatsapp_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.whatsapp_logs
    ADD CONSTRAINT whatsapp_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict YIHrodVciqZVI2YD4J5FdBMWPFPdjkUGchTVilRen7YiiL2Om9wulu45tL3tP2C

