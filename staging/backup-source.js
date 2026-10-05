import fs from 'node:fs';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
import postgres from 'postgres';
const source = dotenv.parse(fs.readFileSync('.env')).DATABASE_URL;
const u = new URL(source);
if (u.hostname !== process.env.SOURCE_EXPECTED_HOST) throw new Error('Source host mismatch');
const db = postgres(source, { max: 1, prepare: false, onnotice: () => {} });
try {
 await db.begin('isolation level repeatable read read only', async tx => {
  await tx`SET LOCAL statement_timeout = '120s'`;
  const [{ snapshot }] = await tx`SELECT pg_export_snapshot() AS snapshot`;
  const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  const counts = {};
  for (const { tablename } of tables) {
   const [{ n }] = await tx`SELECT count(*)::text AS n FROM ${tx('public.' + tablename)}`;
   counts[tablename] = n;
  }
  const childEnv = { ...process.env, PGHOST: u.hostname, PGPORT: u.port || '5432', PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password), PGDATABASE: u.pathname.slice(1), PGSSLMODE: 'require', PGOPTIONS: '' };
  await new Promise((resolve, reject) => {
   const c = spawn('C:/Program Files/PostgreSQL/18/bin/pg_dump.exe', ['--lock-wait-timeout=5s','--format=custom','--no-owner','--no-acl','--snapshot='+snapshot,'--file=.staging-local/source.dump'], { env: childEnv, stdio: ['ignore','ignore','pipe'] });
   let error = ''; c.stderr.on('data', b => { error += b; });
   c.on('error', () => reject(new Error('Backup process failed')));
   c.on('exit', code => code === 0 ? resolve() : reject(new Error(error.replaceAll(source, '[redacted]').replaceAll(decodeURIComponent(u.password), '[redacted]'))));
  });
  fs.writeFileSync('.staging-local/source-manifest.json', JSON.stringify({ sourceHost: u.hostname, database: u.pathname.slice(1), capturedAt: new Date().toISOString(), counts }, null, 2));
  console.log(JSON.stringify({ backup: 'complete', tables: tables.length, bytes: fs.statSync('.staging-local/source.dump').size, counts }));
 });
} catch (error) { console.error('Backup failed:', error.code ?? '', error.message.replaceAll(source, '[redacted]').replaceAll(decodeURIComponent(u.password), '[redacted]')); process.exitCode = 1; }
finally { await db.end(); }
