import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'direksi'`);
    console.log("Added direksi");
  } catch (e) {
    console.log("direksi might already exist", e.message);
  }

  try {
    await db.execute(sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner'`);
    console.log("Added owner");
  } catch (e) {
    console.log("owner might already exist", e.message);
  }

  process.exit(0);
}
main();
