import fs from 'node:fs';
import postgres from 'postgres';
import { execFileSync } from 'node:child_process';
process.loadEnvFile('/etc/prtrack-staging/migration.env');
const adminArgs=['-u','prtrack-staging-db','--','psql','-X','-q','-v','ON_ERROR_STOP=1','-h','/var/lib/prtrack-staging-db/run','-p','55440','-d','prtrack_staging'];
const db=postgres(process.env.STAGING_DATABASE_URL,{max:1,onnotice:()=>{}});
try{
 if((await db`SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'`)[0].n!==0)throw new Error('Restore target is not empty');
 const dump=fs.readFileSync('/tmp/prtrack-pilot-upload/sanitized-pg16.sql','utf8');
 execFileSync('runuser',[...adminArgs,'--single-transaction'],{input:'SET ROLE prtrack_staging;\n'+dump,stdio:['pipe','ignore','pipe']});
 const expected=JSON.parse(fs.readFileSync(new URL('./sanitized-manifest.json',import.meta.url)));
 const counts={};for(const t of Object.keys(expected)) counts[t]=(await db`SELECT count(*)::text n FROM ${db('public.'+t)}`)[0].n;
 if(JSON.stringify(counts)!==JSON.stringify(expected))throw new Error('Restored row counts differ');
 const [s]=await db`SELECT (SELECT count(*) FROM refresh_tokens)::int sessions,(SELECT count(*) FROM user_devices)::int devices,
 (SELECT count(*) FROM users WHERE password_hash <> '!disabled-staging!' OR apple_refresh_token IS NOT NULL OR wa_notifications_enabled)::int unsafe_users,
 (SELECT count(*) FROM payment_history WHERE bukti_pembayaran IS NOT NULL)::int attachments`;
 if(Object.values(s).some(n=>n!==0))throw new Error('Unsafe sanitized copy');
 const invalid=await db`SELECT 1 FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated`;
 if(invalid.length)throw new Error('Invalid constraints');
 const instance=process.env.STAGING_INSTANCE_ID;if(!/^[0-9a-f-]{36}$/.test(instance))throw new Error('Invalid instance');
 execFileSync('runuser',adminArgs,{input:`CREATE SCHEMA staging_control;
 CREATE TABLE staging_control.identity(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),instance_id uuid NOT NULL,database_oid oid NOT NULL,sanitized boolean NOT NULL DEFAULT false);
 INSERT INTO staging_control.identity(instance_id,database_oid,sanitized) SELECT '${instance}'::uuid,oid,true FROM pg_database WHERE datname=current_database();
 GRANT USAGE ON SCHEMA staging_control TO prtrack_staging,prtrack_sync_reader;
 GRANT SELECT ON staging_control.identity TO prtrack_staging,prtrack_sync_reader;`,stdio:['pipe','ignore','pipe']});
 fs.writeFileSync('/etc/prtrack-staging/restore-evidence.json',JSON.stringify({instance,counts,constraintsValidated:true,sanitization:s,restoredAt:new Date().toISOString()},null,2),{mode:0o600});
 console.log(JSON.stringify({restoredTables:Object.keys(counts).length,countsMatch:true,constraintsValidated:true,sanitization:s}));
}catch{console.error('Staging restore/verification failed; API must remain stopped');process.exitCode=1;}
finally{await db.end();}
