import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE payment_history ADD COLUMN bukti_pembayaran text;`);
    console.log("Column bukti_pembayaran added successfully.");
  } catch (error) {
    console.error("Error or already exists:", error.message);
  }
  process.exit(0);
}

run();
