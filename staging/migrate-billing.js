import {readFile} from 'node:fs/promises';
import {connectStaging} from './guard.js';
const db=await connectStaging();
try {
 await db.begin(async tx=>{
  await tx`SELECT set_config('prtrack.staging_id',${process.env.STAGING_INSTANCE_ID},true)`;
  await tx.unsafe(await readFile(new URL('./billing.sql',import.meta.url),'utf8'));
 });
 console.log('Staging billing migration applied; billing mode remains unchanged.');
} finally {await db.end();}
