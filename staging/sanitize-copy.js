import { connectStaging } from './guard.js';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
let db;
try {
 db = await connectStaging(process.env, { ready: false });
 const inventory = JSON.parse(fs.readFileSync('.staging-local/schema-inventory.json'));
 const expectedTables = ['audit_logs','banners','clusters','companies','documentation','handovers','payment_history','progress','projects','property_assignments','refresh_tokens','retention_complaints','retentions','timelines','units','user_devices','users','whatsapp_logs'];
 await db.begin(async tx => {
  if ((await tx`SELECT to_regclass('public.sync_outbox') present`)[0].present) throw new Error('Sanitize before sync migration');
  const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  if (JSON.stringify(tables.map(t=>t.tablename)) !== JSON.stringify(expectedTables)) throw new Error('Unreviewed schema');
  const columns = await tx`SELECT table_name,column_name,data_type,is_nullable,character_maximum_length FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
  if (JSON.stringify(columns) !== JSON.stringify(inventory)) throw new Error('Schema inventory changed');
  await tx`DELETE FROM refresh_tokens`; await tx`DELETE FROM user_devices`;
  for (const c of columns.filter(c=>expectedTables.includes(c.table_name))) {
   if (['refresh_tokens','user_devices'].includes(c.table_name)) continue;
   if (c.table_name==='property_assignments' && c.column_name==='status_kepemilikan') continue;
   if (c.table_name==='whatsapp_logs' && c.column_name==='status') continue;
   if (['text','character varying'].includes(c.data_type)) {
    const t = tx('public.'+c.table_name), col = tx(c.column_name);
    if (c.column_name === 'email') await tx`UPDATE ${t} SET ${col} = 'test-' || id::text || '@example.invalid'`;
    else if (c.column_name === 'password_hash') await tx`UPDATE ${t} SET ${col} = '!disabled-staging!'`;
    else if (c.is_nullable==='YES') await tx`UPDATE ${t} SET ${col} = NULL`;
    else await tx`UPDATE ${t} SET ${col} = left('fixture-' || id::text, ${c.character_maximum_length ?? 255})`;
   } else if (c.data_type==='jsonb') {
    await tx`UPDATE ${tx('public.'+c.table_name)} SET ${tx(c.column_name)} = '[]'::jsonb`;
   }
  }
  await tx`UPDATE users SET wa_notifications_enabled=false, last_login_at=NULL`;
  // Login is not exposed by this service. A named fixture customer is provided for SQL tests only.
  await tx`INSERT INTO users(id,nama,email,password_hash,role,wa_notifications_enabled)
    VALUES('00000000-0000-4000-8000-000000000001','Pilot test customer','pilot@example.invalid','!disabled-staging!','customer',false)`;
 });
 console.log('Copy sanitized: sessions/devices removed; free text and attachments replaced; production passwords disabled');
} catch(error) { console.error('Sanitization failed:',error.code??'',error.message); process.exitCode=1; }
finally { if(db) await db.end(); }
