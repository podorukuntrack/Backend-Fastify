import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function resetDates() {
  console.log('Resetting...');
  const res = await db.execute(sql`UPDATE property_assignments SET reminder_kpr_dates = '[]'::jsonb`);
  console.log('Done', res);
  process.exit(0);
}
resetDates();
