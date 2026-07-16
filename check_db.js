import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'property_assignments'
  `);
  console.log(result);
  process.exit(0);
}
main();
