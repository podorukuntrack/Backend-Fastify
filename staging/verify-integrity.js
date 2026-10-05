import fs from 'node:fs';
import { connectStaging } from './guard.js';
const db=await connectStaging();
try{
 const columns=await db`SELECT table_name,column_name,data_type,is_nullable,character_maximum_length FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
 const original=JSON.parse(fs.readFileSync(new URL('./source-schema-inventory.json',import.meta.url)));
 const expectedColumns=original.every(c=>columns.some(r=>Object.keys(c).every(k=>c[k]===r[k])));
 if(!expectedColumns)throw new Error('Source schema mismatch');
 const constraints=await db`SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition,convalidated FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype IN ('p','u','f','c')`;
 const before=JSON.parse(fs.readFileSync(new URL('./source-constraints.json',import.meta.url))).filter(c=>!c.definition.startsWith('NOT NULL'));
 if(!before.every(c=>constraints.some(r=>r.table_name===c.table_name&&r.conname===c.conname&&r.definition===c.definition&&r.convalidated)))throw new Error('Constraints mismatch');
 const sequences=await db`SELECT schemaname,sequencename,last_value FROM pg_sequences WHERE schemaname IN ('public','drizzle')`;
 const migrationMax=(await db`SELECT coalesce(max(id),0) n FROM drizzle.__drizzle_migrations`)[0].n;
 const seq=sequences.find(r=>r.schemaname==='drizzle');if(seq&&Number(seq.last_value)<migrationMax)throw new Error('Sequence behind rows');
 const [relations]=await db`SELECT count(*)::int outside_customer_scope FROM property_assignments a JOIN users u ON u.id=a.user_id WHERE u.role<>'customer'`;
 const [payments]=await db`SELECT count(*)::int incorrectly_verified FROM payment_history WHERE status_verifikasi<>'menunggu' OR dikunci_si`;
 if(payments.incorrectly_verified)throw new Error('Historical payments were verified');
 const evidence={sourceColumnsPreserved:expectedColumns,sourceConstraintsPreserved:true,sequencesSafe:true,relations,payments};
 fs.writeFileSync('/etc/prtrack-staging/integrity-evidence.json',JSON.stringify(evidence,null,2),{mode:0o600});console.log(evidence);
}finally{await db.end();}
