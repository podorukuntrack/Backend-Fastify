import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT id, email, role FROM users WHERE id = '277bc23e-eddd-4b6d-adbf-1f3c3384f9b6'
  `);
  console.log(result);
  process.exit(0);
}
main();
