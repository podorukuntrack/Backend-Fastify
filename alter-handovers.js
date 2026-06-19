import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE handovers ADD COLUMN document_url text;`);
    console.log("Column document_url added successfully to handovers.");
  } catch (error) {
    console.error("Error or already exists:", error.message);
  }
  process.exit(0);
}

run();
