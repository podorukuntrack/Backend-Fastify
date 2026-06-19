import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from './src/shared/schemas/schema.js';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
const db = drizzle(sql);

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await db.insert(users).values({
      nama: 'Super Admin',
      email: 'admin@prjp.com',
      password_hash: hashedPassword,
      nomor_telepon: '081234567890',
      role: 'super_admin'
    });

    console.log('✅ Default super_admin created: admin@prjp.com / password123');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

seed();
