import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function checkDb() {
  try {
    const res = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'whatsapp_logs';`);
    console.log('Columns in whatsapp_logs:', res);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkDb();
