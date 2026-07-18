import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { buildApp } from './app.js';
import { db, client } from './config/database.js';
import './shared/utils/queue.js';
import { startHandoverCron } from './jobs/handover.cron.js';
import { startKprReminderCron } from './jobs/kpr-reminder.cron.js';

// Load .env utama
dotenv.config({ path: '.env', override: true });

// Cron jobs hanya berjalan di worker pertama (PM2 cluster mode)
// Mencegah pengiriman notifikasi duplikat dari setiap worker
const instanceId = parseInt(process.env.NODE_APP_INSTANCE || '0', 10);
if (instanceId === 0) {
  startHandoverCron();
  startKprReminderCron();
  console.log('🕒 Cron jobs started on primary worker (instance 0)');
} else {
  console.log(`⏭️ Cron jobs skipped on worker instance ${instanceId}`);
}

const start = async () => {
  try {
    console.log('Checking database connection...');

    const result = await db.execute(sql`SELECT NOW() as now`);

    console.log('✅ Database connected successfully');
    console.log('🕒 Database time:', result.rows?.[0]?.now || result[0]?.now);

    const app = await buildApp();

    // Ambil PORT dari env, default ke 3000 kalau kosong
    const port = parseInt(process.env.PORT, 10) || 3000;

    await app.listen({
      port,
      host: '0.0.0.0',
    });

    console.log(`🚀 Server running on port ${port}`);

    // ── Graceful Shutdown ──────────────────────────────────────
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
      try {
        await app.close();
        console.log('✅ Fastify server closed');
        await client.end();
        console.log('✅ Database connection closed');
      } catch (err) {
        console.error('❌ Error during shutdown:', err);
      }
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('❌ Failed to start application');
    console.error(err);
    process.exit(1);
  }
};

start();
