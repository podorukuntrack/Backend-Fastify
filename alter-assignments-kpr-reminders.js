import { sql } from 'drizzle-orm';
import { db } from './src/config/database.js';

async function runMigration() {
  console.log('🚀 Starting migration for property_assignments...');

  try {
    // Add reminder_kpr_dates column
    await db.execute(sql`
      ALTER TABLE property_assignments
      ADD COLUMN IF NOT EXISTS reminder_kpr_dates JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Migration successful: Added reminder_kpr_dates to property_assignments.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
