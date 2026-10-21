-- Run by the provider/role administrator. No application tables required yet.
-- Role provisioning only: apply integration-grants.sql after the migrations.
-- Provision login credentials separately through the secret manager.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='prtrack_integration_reader') THEN
  CREATE ROLE prtrack_integration_reader NOLOGIN NOINHERIT CONNECTION LIMIT 6 NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='prtrack_integration_writer') THEN
  CREATE ROLE prtrack_integration_writer NOLOGIN NOINHERIT CONNECTION LIMIT 6 NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
 END IF;
END $$;
ALTER ROLE prtrack_integration_reader SET default_transaction_read_only=on;
ALTER ROLE prtrack_integration_reader SET statement_timeout='15s';
ALTER ROLE prtrack_integration_writer SET statement_timeout='15s';
ALTER ROLE prtrack_integration_writer SET lock_timeout='5s';

ALTER ROLE prtrack_integration_reader SET idle_in_transaction_session_timeout='15s';
ALTER ROLE prtrack_integration_writer SET idle_in_transaction_session_timeout='15s';
