import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { buildApp } from './app.js';
import { db } from './config/database.js';

// Load .env utama
dotenv.config({ path: '.env' });

const start = async () => {
  try {
    console.log('Checking database connection...');

    const result = await db.execute(sql`SELECT NOW() as now`);

    console.log('✅ Database connected successfully');
    console.log('🕒 Database time:', result.rows?.[0]?.now || result[0]?.now);
    console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL);

    const app = await buildApp();

    // Ambil PORT dari env, default ke 3000 kalau kosong
    const port = parseInt(process.env.PORT, 10) || 3000;

    await app.listen({
      port,
      host: '0.0.0.0',
    });

    console.log(`🚀 Server running on port ${port}`);
  } catch (err) {
    console.error('❌ Failed to start application');
    console.error(err);
    process.exit(1);
  }
};

start();
