import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// Load env file
const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

dotenv.config({ path: envFile });

import { buildApp } from './app.js';
import { db } from './config/database.js';

const start = async () => {
  try {
    console.log('Checking database connection...');

    const result = await db.execute(sql`SELECT NOW() as now`);

    console.log('✅ Database connected successfully');
    console.log('🕒 Database time:', result.rows?.[0]?.now || result[0]?.now);
    console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL);

    const app = await buildApp();

    const port = Number(process.env.PORT) || 3000;

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