// src/config/database.js

import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

dotenv.config();

// Ambil DATABASE_URL
const connectionString = process.env.DATABASE_URL;

// Validasi
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not defined. Please check your .env file or environment variables.'
  );
}

// Batas koneksi per proses. PM2 cluster mode menjalankan satu proses per vCPU,
// dan tiap proses membuka pool-nya sendiri — jadi total koneksi ke database
// adalah nilai ini dikali jumlah instance. Layanan database berlangganan punya
// kuota koneksi (paket Starter Sumopod: 50), sehingga angka ini perlu ikut
// turun bila vCPU ditambah. Dibuat dapat ditimpa lewat env supaya penyesuaian
// tidak menuntut perubahan kode.
const maxConnections = parseInt(process.env.DB_POOL_MAX, 10) || 10;

// Buat koneksi postgres
const client = postgres(connectionString, {
  // Wajib false di belakang connection pooler mode transaction (PgBouncer,
  // Supavisor, Neon pooler): pooler memindahkan koneksi server antar klien
  // tiap transaksi, sehingga prepared statement yang dibuat di satu koneksi
  // tidak ditemukan saat dieksekusi.
  prepare: false,
  max: maxConnections,
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