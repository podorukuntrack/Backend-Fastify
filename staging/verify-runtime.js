import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { connectStaging } from './guard.js';
import { SYNC_ENTITIES } from '../src/modules/sync/sync.config.js';
const db=await connectStaging();
try{
 const token=process.env.TRACK_SYNC_TOKEN;
 const headers={authorization:`Bearer ${token}`};
 const base='http://127.0.0.1:3201';
 const evidence={time:new Date().toISOString(),base,entities:{}};
 async function get(path){const r=await fetch(base+path,{headers});if(!r.ok)throw new Error('HTTP verification failed');return r.json();}
 evidence.health=await get('/health');
 for(const e of SYNC_ENTITIES){let after,rows=[];while(true){const p=await get(`/sync/v1/snapshot/${e}?limit=41${after?'&page_after_id='+after:''}`);rows.push(...p.rows);if(!p.has_more)break;after=p.rows.at(-1).id;}
 const checksum=await get('/sync/v1/checksum/'+e);
 const hash=createHash('md5').update(rows.map(r=>`${r.id}:${r.row_version}`).join(',')).digest('hex');
 if(hash!==checksum.hash||rows.length!==checksum.count)throw new Error('Checksum mismatch');
 evidence.entities[e]=checksum;
 }
 const a=await get('/sync/v1/events?limit=2');
 if(a.events.length>2||!Object.hasOwn(a,'has_more')||!Object.hasOwn(a,'server_time'))throw new Error('Event pagination mismatch');
 evidence.eventEnvelope=true;
 evidence.invalidTokenStatus=(await fetch(base+'/sync/v1/events',{headers:{authorization:'Bearer invalid'}})).status;
 evidence.writeStatuses=[];for(const path of ['/sync/v1/schedules/test','/sync/v1/payment-locks/test'])evidence.writeStatuses.push((await fetch(base+path,{method:'PUT',headers})).status);
 let denied=false;try{await db`UPDATE companies SET nama_pt=nama_pt WHERE false`;}catch(error){denied=['25006','42501'].includes(error.code);}
 if(!denied)throw new Error('Runtime role can write');evidence.runtimeWriteDenied=denied;
 const [identity]=await db`SELECT current_database() db,current_user role,inet_server_addr()::text server,inet_server_port() port`;
 evidence.database=identity;
 const [marker]=await db`SELECT instance_id::text,database_oid::text,sanitized FROM staging_control.identity`;
 evidence.identity=marker;
 fs.writeFileSync('/etc/prtrack-staging/runtime-evidence.json',JSON.stringify(evidence,null,2),{mode:0o600});
 console.log(JSON.stringify(evidence,null,2));
}finally{await db.end();}
