import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { connectStaging, validateTarget, assertDatabaseIdentity } from '../staging/guard.js';
import { buildStagingApp } from '../staging/app.js';
import { SYNC_ENTITIES, BUSINESS_FIELDS } from '../src/modules/sync/sync.config.js';
let db, app;
const token='a'.repeat(64);
const headers={authorization:`Bearer ${token}`};
before(async()=>{
 if(process.env.STAGING_TEST_CONFIRM!==process.env.STAGING_INSTANCE_ID) throw new Error('Explicit test target confirmation required');
 db=await connectStaging(); app=await buildStagingApp(db,token);
});
after(async()=>{if(app)await app.close();if(db)await db.end();});
async function get(url){const r=await app.inject({url,headers});assert.equal(r.statusCode,200,r.body);return r.json();}

test('guard rejects URL mismatch, production env, wrong identity and unsafe role',async()=>{
 assert.throws(()=>validateTarget({...process.env,STAGING_DB_NAME:'production'}));
 assert.throws(()=>validateTarget({...process.env,DATABASE_URL:'forbidden'}));
 await assert.rejects(assertDatabaseIdentity(db,{...process.env,STAGING_INSTANCE_ID:randomUUID()}));
 await assert.rejects(assertDatabaseIdentity(db,{...process.env,STAGING_DB_ROLE:'wrong'}));
});
test('health, authentication, input errors, no write or login routes, no secrets',async()=>{
 assert.equal((await app.inject('/health')).statusCode,200);
 assert.equal((await app.inject('/sync/v1/events')).statusCode,401);
 assert.equal((await app.inject({url:'/sync/v1/events',headers:{authorization:'Bearer wrong'}})).statusCode,401);
 for(const url of ['/sync/v1/schedules/'+randomUUID(),'/sync/v1/payment-locks/'+randomUUID()])
  assert.equal((await app.inject({url,method:'PUT',headers,payload:{}})).statusCode,404);
 assert.equal((await app.inject({url:'/api/auth/login',method:'POST'})).statusCode,404);
 for(const url of ['/sync/v1/events?limit=0','/sync/v1/events?after_seq=-1','/sync/v1/events?limit=1001','/sync/v1/snapshot/companies?page_after_id=bad']){
  const r=await app.inject({url,headers});assert.equal(r.statusCode,400);assert.deepEqual(Object.keys(r.json()),['message']);
 }
 assert.equal((await app.inject({url:'/sync/v1/snapshot/nope',headers})).statusCode,404);
 const forbidden=await app.inject({url:'/health',remoteAddress:'192.0.2.1'});assert.equal(forbidden.statusCode,403);
});
test('all seven snapshots paginate completely with matching C-order MD5 checksums',async()=>{
 for(const entity of SYNC_ENTITIES){
  let cursor,rows=[];
  do{
   const page=await get(`/sync/v1/snapshot/${entity}?limit=37${cursor?'&page_after_id='+cursor:''}`);
   assert.equal(typeof page.max_seq,'number');
   for(const r of page.rows){assert.equal(typeof r.row_version,'number');assert.ok(Object.keys(r).every(k=>k==='row_version'||BUSINESS_FIELDS[entity].includes(k)));}
   rows.push(...page.rows);if(!page.has_more)break;
   assert.ok(page.rows.length);cursor=page.rows.at(-1).id;
  }while(true);
  assert.deepEqual(rows.map(r=>r.id),rows.map(r=>r.id).sort());
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const checksum=await get(`/sync/v1/checksum/${entity}`);
  assert.equal(checksum.count,rows.length);
  assert.equal(checksum.hash,createHash('md5').update(rows.map(r=>`${r.id}:${r.row_version}`).join(',')).digest('hex'));
  assert.ok(!JSON.stringify(rows).includes('password_hash'));
 }
});
test('raw SQL I/U/D, role changes, delete/reinsert monotone versions, rollback, cascades',async()=>{
 const id=randomUUID();
 await db.begin(async tx=>{
  await tx`INSERT INTO users(id,nama,email,password_hash,role) VALUES(${id},'fixture',${id+'@example.invalid'},'secret-canary','customer')`;
  await tx`UPDATE users SET nama='changed' WHERE id=${id}`;
  await tx`UPDATE users SET role='admin' WHERE id=${id}`;
  await tx`UPDATE users SET role='customer' WHERE id=${id}`;
  await tx`DELETE FROM users WHERE id=${id}`;
  await tx`INSERT INTO users(id,nama,email,password_hash,role) VALUES(${id},'fixture',${id+'@example.invalid'},'secret-canary','customer')`;
  const events=await tx`SELECT * FROM sync_outbox WHERE entity_id=${id} ORDER BY seq`;
  assert.deepEqual(events.map(e=>e.op),['I','U','D','I','D','I']);
  assert.ok(events.every((e,i)=>!i||BigInt(e.row_version)>BigInt(events[i-1].row_version)));
  assert.ok(events.filter(e=>e.op==='D').every(e=>e.payload===null));
  assert.ok(!JSON.stringify(events).includes('secret-canary'));
  await tx`DELETE FROM users WHERE id=${id}`;
 });
 const rolled=randomUUID();
 await assert.rejects(db.begin(async tx=>{await tx`INSERT INTO companies(id,nama_pt,kode_pt) VALUES(${rolled},'rollback',${rolled})`;throw new Error('rollback');}));
 assert.equal((await db`SELECT * FROM sync_outbox WHERE entity_id=${rolled}`).length,0);
 await db.begin(async tx=>{
  const c=randomUUID(),p=randomUUID(),cl=randomUUID(),u=randomUUID(),a=randomUUID(),pay=randomUUID();
  await tx`INSERT INTO companies(id,nama_pt,kode_pt) VALUES(${c},'fixture',${c})`;
  await tx`INSERT INTO projects(id,company_id,nama_proyek,lokasi) VALUES(${p},${c},'fixture','fixture')`;
  await tx`INSERT INTO clusters(id,project_id,nama_cluster) VALUES(${cl},${p},'fixture')`;
  await tx`INSERT INTO units(id,cluster_id,nomor_unit,tipe_rumah) VALUES(${u},${cl},'fixture','fixture')`;
  await tx`INSERT INTO property_assignments(id,user_id,unit_id,tipe_pembayaran,harga_total,dp) VALUES(${a},'00000000-0000-4000-8000-000000000001',${u},'cash_lunas',1000,0)`;
  await tx`INSERT INTO payment_history(id,assignment_id,jumlah_bayar,tanggal_bayar) VALUES(${pay},${a},100,current_date)`;
  const [payment]=await tx`SELECT status_verifikasi FROM payment_history WHERE id=${pay}`;assert.equal(payment.status_verifikasi,'menunggu');
  await tx`DELETE FROM property_assignments WHERE id=${a}`;
  await tx`DELETE FROM projects WHERE id=${p}`;
  for(const key of [a,pay,p,cl,u]) assert.ok((await tx`SELECT * FROM sync_outbox WHERE entity_id=${key} AND op='D'`).length);
  await tx`DELETE FROM companies WHERE id=${c}`;
 });
});
test('contract risk reproduced: long transaction commits behind advanced cursor; replay is stable; rollback gap exists',async()=>{
 const a=randomUUID(),b=randomUUID();let release,inserted;
 const hold=new Promise(r=>release=r),ready=new Promise(r=>inserted=r);
 const long=db.begin(async tx=>{await tx`INSERT INTO companies(id,nama_pt,kode_pt) VALUES(${a},'long',${a})`;inserted();await hold;});
 try{
  await ready;
  await db`INSERT INTO companies(id,nama_pt,kode_pt) VALUES(${b},'short',${b})`;
  await new Promise(r=>setTimeout(r,5200));
  const [{seq:bseq}]=await db`SELECT seq FROM sync_outbox WHERE entity_id=${b}`;
  const page=await get('/sync/v1/events?limit=1000');
  assert.ok(page.events.some(e=>e.entity_id===b));assert.ok(!page.events.some(e=>e.entity_id===a));
  release();await long;
  const missed=await get('/sync/v1/events?after_seq='+bseq);
  assert.ok(!missed.events.some(e=>e.entity_id===a),'late commit is missed under documented cursor semantics');
  const replay=await get('/sync/v1/events?limit=1000');
  const again=await get('/sync/v1/events?limit=1000');assert.deepEqual(replay.events,again.events);
  const seqs=(await db`SELECT seq FROM sync_outbox ORDER BY seq`).map(r=>Number(r.seq));assert.ok(seqs.some((n,i)=>i&&n>seqs[i-1]+1));
  const mirror=new Map();for(const e of [...replay.events,...replay.events]){const old=mirror.get(e.entity_id);if(!old||e.row_version>old.row_version)mirror.set(e.entity_id,e);}
  assert.ok(mirror.size>0);
 }finally{release();await long;await db`DELETE FROM companies WHERE id IN (${a},${b})`;}
});
test('contract risk reproduced: insert behind snapshot page cursor is missed while max_seq advances',async()=>{
 const id='00000000-0000-4000-8000-000000000002';
 const first=await get('/sync/v1/snapshot/companies?limit=1');assert.ok(first.rows[0].id>id);
 await db`INSERT INTO companies(id,nama_pt,kode_pt) VALUES(${id},'between pages',${id})`;
 try{
  const next=await get('/sync/v1/snapshot/companies?limit=1000&page_after_id='+first.rows[0].id);
  assert.ok(!next.rows.some(r=>r.id===id));assert.ok(next.max_seq>first.max_seq);
 }finally{await db`DELETE FROM companies WHERE id=${id}`;}
});

