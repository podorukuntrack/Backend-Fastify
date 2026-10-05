import { readFile } from 'node:fs/promises';
import { connectStaging } from './guard.js';
let db;
try {
  db = await connectStaging();
  await db.begin(async tx => {
    await tx`SELECT set_config('prtrack.staging_id', ${process.env.STAGING_INSTANCE_ID}, true)`;
    await tx.unsafe(await readFile(new URL('./sync.sql', import.meta.url), 'utf8'));
  });
  console.log('Staging sync migration applied');
} catch { console.error('Staging migration rejected or failed (details withheld)'); process.exitCode = 1; }
finally { if (db) await db.end(); }
