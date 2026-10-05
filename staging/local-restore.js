import postgres from 'postgres';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const admin = postgres('postgres://local_test_admin@127.0.0.1:55439/postgres', { onnotice: () => {} });
const pass = randomBytes(32).toString('hex'), instance = randomUUID();
try {
 await admin.unsafe(`CREATE ROLE prtrack_staging LOGIN PASSWORD '${pass}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
 await admin.unsafe('CREATE DATABASE prtrack_staging OWNER prtrack_staging');
 await admin.unsafe('REVOKE CONNECT ON DATABASE postgres FROM PUBLIC');
 await admin.unsafe('REVOKE ALL ON DATABASE prtrack_staging FROM PUBLIC');
 const result = spawnSync('C:/Program Files/PostgreSQL/18/bin/pg_restore.exe', ['--exit-on-error','--no-owner','--no-acl','--host=127.0.0.1','--port=55439','--username=prtrack_staging','--dbname=prtrack_staging','.staging-local/source.dump'], { env: { ...process.env, PGPASSWORD: pass }, encoding: 'utf8' });
 fs.writeFileSync('.staging-local/restore.log', result.stderr ?? '');
 if (result.status !== 0) throw new Error('Restore failed (protected log)');
 const env = { NODE_ENV:'staging', STAGING_DATABASE_URL:`postgres://prtrack_staging:${pass}@127.0.0.1:55439/prtrack_staging`, STAGING_DB_HOST:'127.0.0.1', STAGING_DB_PORT:'55439', STAGING_DB_NAME:'prtrack_staging', STAGING_DB_ROLE:'prtrack_staging', STAGING_INSTANCE_ID:instance, TRACK_SYNC_TOKEN:randomBytes(32).toString('hex'), STAGING_PORT:'3201' };
 fs.writeFileSync('.staging-local/staging.env', Object.entries(env).map(([k,v])=>`${k}=${v}`).join('\n'));
 const copy = postgres('postgres://local_test_admin@127.0.0.1:55439/prtrack_staging', { onnotice: () => {} });
 await copy.unsafe(`CREATE SCHEMA staging_control; CREATE TABLE staging_control.identity(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),instance_id uuid NOT NULL,database_oid oid NOT NULL,sanitized boolean NOT NULL DEFAULT false); GRANT USAGE ON SCHEMA staging_control TO prtrack_staging; GRANT SELECT ON staging_control.identity TO prtrack_staging;`);
 await copy`INSERT INTO staging_control.identity(instance_id,database_oid) SELECT ${instance}::uuid,oid FROM pg_database WHERE datname=current_database()`;
 const counts = {};
 const tables = await copy`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
 for (const { tablename } of tables) counts[tablename] = (await copy`SELECT count(*)::text n FROM ${copy('public.'+tablename)}`)[0].n;
 const source = JSON.parse(fs.readFileSync('.staging-local/source-manifest.json'));
 if (JSON.stringify(counts) !== JSON.stringify(source.counts)) throw new Error('Restore counts differ');
 const columns = await copy`SELECT table_name,column_name,data_type,is_nullable,character_maximum_length FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
 fs.writeFileSync('.staging-local/schema-inventory.json',JSON.stringify(columns,null,2));
 const constraints = await copy`SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition, convalidated FROM pg_constraint WHERE connamespace='public'::regnamespace`;
 fs.writeFileSync('.staging-local/constraints.json',JSON.stringify(constraints,null,2));
 fs.writeFileSync('.staging-local/restore-evidence.json',JSON.stringify({ countsMatch:true,counts,constraintsValidated:constraints.every(c=>c.convalidated),instance },null,2));
 console.log(JSON.stringify({ restoredTables: tables.length, countsMatch:true, constraintsValidated:constraints.every(c=>c.convalidated) }));
 await copy.end();
} catch(error) { console.error(error.message); process.exitCode=1; }
finally { await admin.end(); }
