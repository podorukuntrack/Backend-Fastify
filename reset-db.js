import 'dotenv/config';
import postgres from 'postgres';
import { execSync } from 'child_process';

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function resetDB() {
  try {
    console.log('Dropping public schema...');
    await sql`DROP SCHEMA public CASCADE;`;
    console.log('Creating public schema...');
    await sql`CREATE SCHEMA public;`;
    
    console.log('Running drizzle-kit push on fresh schema...');
    // Since schema is empty, it shouldn't prompt for data loss, but we add --force just in case
    execSync('npx drizzle-kit push --force', { stdio: 'inherit' });

    console.log('Running index migrations...');
    execSync('node migrate-indexes.js', { stdio: 'inherit' });

    console.log('✅ Database reset and migrations applied successfully.');
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

resetDB();
