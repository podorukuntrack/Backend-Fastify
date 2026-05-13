

BEGIN;


CREATE EXTENSION IF NOT EXISTS pgcrypto;


DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'customer_service',
    'customer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE unit_status AS ENUM (
    'belum_mulai',
    'dalam_pembangunan',
    'selesai'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM (
    'foto',
    'video',
    'dokumen',
    'foto_360'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash_lunas',
    'cash_cicil',
    'kredit_kpr'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- MASTER TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_pt TEXT NOT NULL,
  kode_pt TEXT NOT NULL UNIQUE,
  alamat TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  nama TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nomor_telepon TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  status user_status NOT NULL DEFAULT 'active',
  wa_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECT STRUCTURE
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  nama_proyek TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  deskripsi TEXT,
  status project_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nama_cluster TEXT NOT NULL,
  jumlah_unit INTEGER NOT NULL DEFAULT 0 CHECK (jumlah_unit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  nomor_unit TEXT NOT NULL,
  tipe_rumah TEXT,
  luas_tanah NUMERIC(10,2) CHECK (luas_tanah > 0),
  luas_bangunan NUMERIC(10,2) CHECK (luas_bangunan > 0),
  status_pembangunan unit_status NOT NULL DEFAULT 'belum_mulai',
  progress_percentage SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cluster_id, nomor_unit)
);

-- ============================================================
-- SALES & CUSTOMER OWNERSHIP
-- ============================================================

CREATE TABLE IF NOT EXISTS property_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  tanggal_pembelian DATE NOT NULL DEFAULT CURRENT_DATE,
  status_kepemilikan TEXT NOT NULL DEFAULT 'active'
    CHECK (status_kepemilikan IN ('active','inactive')),
  tipe_pembayaran payment_method NOT NULL,
  harga_total NUMERIC(15,2) NOT NULL CHECK (harga_total >= 0),
  total_dibayar NUMERIC(15,2) NOT NULL DEFAULT 0,
  tenor_bulan INTEGER DEFAULT 0,
  keterangan_kpr TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (total_dibayar >= 0 AND total_dibayar <= harga_total)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_assignment
ON property_assignments(unit_id)
WHERE status_kepemilikan = 'active';

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES property_assignments(id) ON DELETE CASCADE,
  jumlah_bayar NUMERIC(15,2) NOT NULL CHECK (jumlah_bayar > 0),
  tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONSTRUCTION PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tahap TEXT NOT NULL,
  progress_percentage SMALLINT NOT NULL CHECK (progress_percentage BETWEEN 0 AND 100),
  tanggal_update DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS construction_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tahap TEXT NOT NULL,
  tanggal_rencana_mulai DATE,
  tanggal_rencana_selesai DATE,
  tanggal_realisasi_mulai DATE,
  tanggal_realisasi_selesai DATE,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','ongoing','completed','delayed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  progress_id UUID REFERENCES progress(id) ON DELETE SET NULL,
  jenis doc_type NOT NULL,
  url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  nama_file TEXT,
  ukuran_bytes BIGINT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RETENTION
-- ============================================================

CREATE TABLE IF NOT EXISTS retentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  nilai_retensi NUMERIC(15,2) NOT NULL,
  tanggal_mulai DATE,
  tanggal_jatuh_tempo DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','released','cancelled')),
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HANDOVER
-- ============================================================

CREATE TABLE IF NOT EXISTS handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES property_assignments(id) ON DELETE CASCADE,
  tanggal_serah_terima DATE,
  nomor_bast TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','completed','cancelled')),
  catatan TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handover_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
  deskripsi TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMER SERVICE
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES property_assignments(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES customer_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  nomor_tujuan TEXT NOT NULL,
  template_name TEXT,
  message_body TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','read','failed')),
  provider_message_id TEXT,
  response_payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_clusters_project ON clusters(project_id);
CREATE INDEX IF NOT EXISTS idx_units_cluster ON units(cluster_id);
CREATE INDEX IF NOT EXISTS idx_progress_unit_date ON progress(unit_id, tanggal_update DESC);
CREATE INDEX IF NOT EXISTS idx_docs_unit ON documentation(unit_id);
CREATE INDEX IF NOT EXISTS idx_docs_progress ON documentation(progress_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON property_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_assignment ON payment_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON customer_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user ON whatsapp_logs(user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_unit_progress()
RETURNS TRIGGER
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

CREATE OR REPLACE FUNCTION fn_update_total_pembayaran()
RETURNS TRIGGER
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

-- ============================================================
-- TRIGGERS
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies',
    'users',
    'projects',
    'clusters',
    'units',
    'property_assignments',
    'progress',
    'construction_timelines',
    'handovers',
    'customer_tickets'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW
       EXECUTE FUNCTION fn_set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_sync_progress ON progress;
CREATE TRIGGER trg_sync_progress
AFTER INSERT OR UPDATE OR DELETE ON progress
FOR EACH ROW
EXECUTE FUNCTION fn_sync_unit_progress();

DROP TRIGGER IF EXISTS trg_update_payment ON payment_history;
CREATE TRIGGER trg_update_payment
AFTER INSERT OR UPDATE OR DELETE ON payment_history
FOR EACH ROW
EXECUTE FUNCTION fn_update_total_pembayaran();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_unit_detail AS
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
FROM units u
JOIN clusters c ON c.id = u.cluster_id
JOIN projects p ON p.id = c.project_id
JOIN companies comp ON comp.id = p.company_id;

CREATE OR REPLACE VIEW v_assignment_detail AS
SELECT
  pa.id AS assignment_id,
  pa.tanggal_pembelian,
  pa.tipe_pembayaran,
  pa.harga_total,
  pa.total_dibayar,
  ROUND((pa.total_dibayar / NULLIF(pa.harga_total, 0)) * 100, 2) AS persentase_dibayar,
  u.nomor_unit,
  u.progress_percentage AS progress_pembangunan,
  c.nama_cluster,
  p.nama_proyek,
  usr.nama AS customer_nama,
  usr.email AS customer_email,
  comp.nama_pt
FROM property_assignments pa
JOIN users usr ON usr.id = pa.user_id
JOIN units u ON u.id = pa.unit_id
JOIN clusters c ON c.id = u.cluster_id
JOIN projects p ON p.id = c.project_id
JOIN companies comp ON comp.id = p.company_id;

CREATE OR REPLACE VIEW v_customer_dashboard AS
SELECT
  pa.id AS assignment_id,
  pa.user_id,
  u.nomor_unit,
  c.nama_cluster,
  p.nama_proyek,
  u.progress_percentage AS progress_pembangunan,
  pa.harga_total,
  pa.total_dibayar,
  ROUND((pa.total_dibayar / NULLIF(pa.harga_total, 0)) * 100, 2) AS progress_pembayaran,
  h.tanggal_serah_terima,
  h.status AS status_serah_terima
FROM property_assignments pa
JOIN units u ON u.id = pa.unit_id
JOIN clusters c ON c.id = u.cluster_id
JOIN projects p ON p.id = c.project_id
LEFT JOIN handovers h ON h.assignment_id = pa.id
WHERE pa.status_kepemilikan = 'active';

COMMIT;
