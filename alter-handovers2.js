import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });
import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false;`);
    console.log("Added reminder_24h_sent column.");
    await db.execute(sql`ALTER TABLE handovers ADD COLUMN IF NOT EXISTS reminder_2h_sent boolean DEFAULT false;`);
    console.log("Added reminder_2h_sent column.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
