import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE retentions ADD COLUMN photo_before_url text;`);
    await db.execute(sql`ALTER TABLE retentions ADD COLUMN photo_after_url text;`);
    console.log("Columns added to retentions.");
  } catch (error) {
    console.error("Error or already exists:", error.message);
  }
  process.exit(0);
}

run();
