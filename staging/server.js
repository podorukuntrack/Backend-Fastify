import { connectStaging } from './guard.js';
import { buildStagingApp } from './app.js';
let db;
try {
  db = await connectStaging();
  const port = Number(process.env.STAGING_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || [3000, 3100].includes(port)) throw new Error('Dedicated staging port required');
  const app = await buildStagingApp(db, process.env.TRACK_SYNC_TOKEN);
  await app.listen({ host: '127.0.0.1', port });
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => { await app.close(); await db.end(); });
  console.log('PRTrack staging sync API started on loopback');
} catch {
  console.error('PRTrack staging startup rejected; verify identity and staging configuration');
  if (db) await db.end();
  process.exitCode = 1;
}
