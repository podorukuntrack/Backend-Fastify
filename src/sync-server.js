// Dedicated integration process. Business server and existing staging reader remain unchanged.
import Fastify from 'fastify';
import postgres from 'postgres';
import syncRoutes,{syncRoutesV2} from './modules/sync/sync.routes.js';
import {createSyncService} from './modules/sync/sync.service.js';
import {createSyncRepository} from './modules/sync/sync.repository.js';
import billingRoutes from './modules/sync/billing.routes.js';

const required=['TRACK_SYNC_DATABASE_URL','TRACK_SYNC_TOKEN','TRACK_SYNC_SOURCE_ID','TRACK_SYNC_ALLOWED_IPS'];
if(required.some(k=>!process.env[k])) throw new Error('Explicit sync connection, source identity, token and allowlist required');
const mode=process.env.TRACK_SYNC_DB_MODE||'restricted';
if(!['restricted','application'].includes(mode)) throw new Error('TRACK_SYNC_DB_MODE must be restricted or application');
const application=mode==='application';
if(application && !process.env.TRACK_SYNC_DB_USER) throw new Error('Application mode requires explicit TRACK_SYNC_DB_USER');
if(application && process.env.TRACK_SYNC_WRITER_DATABASE_URL && process.env.TRACK_SYNC_WRITER_DATABASE_URL!==process.env.TRACK_SYNC_DATABASE_URL) throw new Error('Application mode uses one Track database connection string');
if(process.env.TRACK_SYNC_TOKEN.length<32) throw new Error('Read token must be at least 32 characters');
const host=process.env.TRACK_SYNC_HOST||'127.0.0.1';
if(host==='0.0.0.0'||host==='::') throw new Error('Wildcard sync binding forbidden');
const ips=process.env.TRACK_SYNC_ALLOWED_IPS.split(',').map(s=>s.trim());
const connectionLimits={statement_timeout:'15000',lock_timeout:'5000',idle_in_transaction_session_timeout:'15000'};
const reader=postgres(process.env.TRACK_SYNC_DATABASE_URL,{prepare:false,max:3,connection:{...connectionLimits,default_transaction_read_only:'on'}});
let writer;
const app=Fastify({logger:false,trustProxy:false,bodyLimit:64*1024});
async function checkRole(connection) {
 const [role]=await connection`SELECT r.rolname,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relowner=r.oid
   AND c.relname IN ('companies','projects','clusters','units','users','property_assignments','payment_history')) AS owned_tables
  FROM pg_roles r WHERE r.rolname=current_user`;
 if(!role || ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'].some(k=>role[k])) throw new Error('Integration database role must not have administrative privileges');
 if(application && (role.rolname!==process.env.TRACK_SYNC_DB_USER || role.owned_tables!==7)) throw new Error('Application mode requires the pinned owner of all seven Track tables');
}
try {
 const [feed]=await reader`SELECT source_id FROM public.sync_feed WHERE singleton`;
 if(feed?.source_id!==process.env.TRACK_SYNC_SOURCE_ID) throw new Error('Sync source identity mismatch');
 await checkRole(reader);
 const [rights]=await reader`SELECT has_table_privilege(current_user,'public.payment_history','INSERT,DELETE') OR has_any_column_privilege(current_user,'public.payment_history','UPDATE') AS writes`;
 if(!application && rights.writes) throw new Error('Sync reader must be a restricted read-only role');
 const [{transaction_read_only:readOnly}]=await reader`SHOW transaction_read_only`;
 if(readOnly!=='on') throw new Error('Integration reader connection must use read-only transactions');
 app.addHook('onRequest',async(req,reply)=>{if(!ips.includes(req.ip)) return reply.code(403).send({message:'Forbidden'});});
 const service=createSyncService({repository:createSyncRepository(reader)});
 await app.register(syncRoutes,{prefix:'/sync/v1',service,token:process.env.TRACK_SYNC_TOKEN});
 await app.register(syncRoutesV2,{prefix:'/sync/v2',service,token:process.env.TRACK_SYNC_TOKEN,monitorToken:process.env.TRACK_MONITOR_TOKEN});
 if(process.env.SYNC_WRITE_ENABLED==='true') {
  if(process.env.TRACK_SCHEDULE_TOKEN===process.env.TRACK_SYNC_TOKEN) throw new Error('Read and write tokens must be independent');
  const writerUrl=application?process.env.TRACK_SYNC_DATABASE_URL:process.env.TRACK_SYNC_WRITER_DATABASE_URL;
  if(!writerUrl) throw new Error('Separate billing writer required');
  writer=postgres(writerUrl,{prepare:false,max:3,connection:connectionLimits});
  await checkRole(writer);
  const [target]=await writer`SELECT source_id FROM public.sync_feed WHERE singleton`;
  if(target?.source_id!==feed.source_id) throw new Error('Writer database does not match reader');
  const [unsafe]=await writer`SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR has_schema_privilege(current_user,'public','CREATE')
    OR has_table_privilege(current_user,'public.payment_history','INSERT,DELETE')
    OR has_column_privilege(current_user,'public.payment_history','jumlah_bayar','UPDATE')
    OR has_column_privilege(current_user,'public.property_assignments','harga_total','UPDATE') AS unsafe FROM pg_roles WHERE rolname=current_user`;
  if(!application && unsafe.unsafe) throw new Error('Billing writer must have restricted column permissions');
  await app.register(billingRoutes,{prefix:'/sync/v1',db:writer,token:process.env.TRACK_SCHEDULE_TOKEN,allowedIps:ips});
 }
 app.get('/health',async()=>({status:'ok'}));
 const address=await app.listen({host,port:Number(process.env.TRACK_SYNC_PORT||3202)});
 console.log('Integration API listening',address);
 console.log('Integration database mode:',mode);
 for(const signal of ['SIGTERM','SIGINT']) process.once(signal,async()=>{await app.close();await reader.end();await writer?.end();process.exit(0);});
} catch(error) {await app.close();await reader.end();await writer?.end();throw error;}
