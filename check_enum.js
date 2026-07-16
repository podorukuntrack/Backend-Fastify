import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'user_role';
  `);
  console.log(result);
  process.exit(0);
}
main();
