// src/config/database.js

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Tentukan file .env berdasarkan NODE_ENV
const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

// Load environment variables
dotenv.config({ path: envFile });

// Debug (opsional)
console.log('📄 Loaded env file:', envFile);
console.log(
  '🔗 DATABASE_URL:',
  process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:(.*?)@/, ':****@')
    : 'undefined'
);

// Ambil DATABASE_URL
const connectionString = process.env.DATABASE_URL;

// Validasi
if (!connectionString) {
  throw new Error(
    `DATABASE_URL is not defined. Please check ${envFile}`
  );
}

// Buat koneksi postgres
const client = postgres(connectionString, {
  prepare: false,      // wajib jika pakai Neon transaction pool
  max: 10,             // maksimum koneksi
  idle_timeout: 20,    // timeout koneksi idle
  connect_timeout: 10, // timeout koneksi awal
});

// Inisialisasi Drizzle ORM
export const db = drizzle(client);

// Export client untuk health check atau shutdown
export { client };

// Optional helper untuk test koneksi
export async function testDatabaseConnection() {
  try {
    const result = await client`SELECT NOW() AS now`;
    console.log('✅ Database connected successfully');
    console.log('🕒 Database time:', result[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed');
    console.error(error.message);
    return false;
  }
}