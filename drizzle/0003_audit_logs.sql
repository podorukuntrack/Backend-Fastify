-- 0003_audit_logs.sql
--
-- Jejak audit untuk tindakan admin yang sensitif.
--
-- LATAR
-- Tidak ada catatan sama sekali atas tindakan destruktif: hapus pengguna, hapus
-- pembayaran, ubah role, ubah status akun, hapus penugasan. Bila terjadi
-- sengketa atau kesalahan, tidak ada cara mengetahui siapa melakukan apa dan kapan.
--
-- CATATAN DESAIN
-- - actor_id memakai ON DELETE SET NULL, dan actor_email disimpan sebagai salinan,
--   agar jejaknya tetap terbaca meski akun pelakunya kemudian dihapus.
-- - Tidak ada foreign key ke entity_id: satu tabel ini menaungi banyak jenis entitas,
--   dan barisnya harus tetap ada setelah entitas aslinya terhapus.
-- - metadata jsonb menyimpan konteks tambahan (nilai sebelum/sesudah, alasan).
--   JANGAN menaruh kata sandi, token, atau kode OTP di sini.
--
-- Aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id    uuid,
    actor_role  text,
    actor_email text,
    company_id  uuid,
    action      text NOT NULL,
    entity      text NOT NULL,
    entity_id   uuid,
    summary     text,
    metadata    jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip          text,
    created_at  timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_pkey') THEN
        ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_id_fkey') THEN
        ALTER TABLE ONLY public.audit_logs
            ADD CONSTRAINT audit_logs_actor_id_fkey
            FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS audit_logs_created_idx  ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx    ON public.audit_logs USING btree (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx   ON public.audit_logs USING btree (entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_company_idx  ON public.audit_logs USING btree (company_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx   ON public.audit_logs USING btree (action);
