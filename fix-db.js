import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function fixDb() {
  try {
    await db.execute(sql`ALTER TABLE whatsapp_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);`);
    console.log('Successfully added company_id to whatsapp_logs');
  } catch (error) {
    console.error('Error altering table:', error);
  }
  process.exit(0);
}

fixDb();
