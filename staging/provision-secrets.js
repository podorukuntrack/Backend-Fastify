import fs from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root='/etc/prtrack-staging';
if(fs.existsSync(root+'/migration.env')) throw new Error('Already provisioned');
const ownerPass=randomBytes(32).toString('hex'),readPass=randomBytes(32).toString('hex'),token=randomBytes(32).toString('hex'),instance=randomUUID();
const sql=`CREATE ROLE prtrack_staging LOGIN PASSWORD '${ownerPass}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE prtrack_sync_reader LOGIN PASSWORD '${readPass}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE DATABASE prtrack_staging OWNER prtrack_staging;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
REVOKE ALL ON DATABASE prtrack_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE prtrack_staging TO prtrack_staging,prtrack_sync_reader;
ALTER ROLE prtrack_sync_reader SET default_transaction_read_only=on;`;
execFileSync('runuser',['-u','prtrack-staging-db','--','psql','-X','-v','ON_ERROR_STOP=1','-h','/var/lib/prtrack-staging-db/run','-p','55440','-d','postgres'],{input:sql,stdio:['pipe','ignore','pipe']});
function write(name,role,password){
 const env={NODE_ENV:'staging',STAGING_DATABASE_URL:`postgres://${role}:${password}@127.0.0.1:55440/prtrack_staging`,STAGING_DB_HOST:'127.0.0.1',STAGING_DB_PORT:'55440',STAGING_DB_NAME:'prtrack_staging',STAGING_DB_ROLE:role,STAGING_INSTANCE_ID:instance,STAGING_PORT:'3201',TRACK_SYNC_TOKEN:token};
 fs.writeFileSync(root+'/'+name,Object.entries(env).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600});
}
write('migration.env','prtrack_staging',ownerPass);write('runtime.env','prtrack_sync_reader',readPass);
fs.writeFileSync(root+'/read-token',token+'\n',{mode:0o600});
fs.writeFileSync(root+'/instance-id',instance+'\n',{mode:0o600});
console.log('Staging-only credentials generated in restricted files');
