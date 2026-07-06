import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    // Drop the old company_id column and its foreign key constraint implicitly when dropping the column
    await db.execute(sql`
      ALTER TABLE public.banners 
      DROP COLUMN IF EXISTS company_id,
      ADD COLUMN IF NOT EXISTS target_companies jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS r2_key text;
    `);
    console.log("Table banners altered successfully.");
  } catch (error) {
    console.error("Error:", error.message);
  }
  process.exit(0);
}

run();
