import { connectStaging } from './guard.js';
import { buildStagingApp } from './app.js';
let db;
const apps = [];
try {
  db = await connectStaging();
  const port = Number(process.env.STAGING_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || [3000, 3100].includes(port)) throw new Error('Dedicated staging port required');
  if (!process.env.TRACK_MONITOR_TOKEN) throw new Error('Monitor token required');
  for (const host of ['127.0.0.1', '10.11.26.196']) {
    const app = await buildStagingApp(db, process.env.TRACK_SYNC_TOKEN, undefined, process.env.TRACK_MONITOR_TOKEN);
    apps.push(app);
    await app.listen({ host, port });
  }
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => { await Promise.all(apps.map(app => app.close())); await db.end(); });
  console.log('PRTrack staging sync API started on loopback and private address');
} catch {
  console.error('PRTrack staging startup rejected; verify identity and staging configuration');
  await Promise.all(apps.map(app => app.close()));
  if (db) await db.end();
  process.exitCode = 1;
}
