import dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './src/shared/schemas/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // drizzle-kit menjalankan DDL dan memakai prepared statement — dua hal yang
    // gagal lewat connection pooler mode transaction. MIGRATION_DATABASE_URL
    // harus menunjuk ke session pooler (atau direct connection), berbeda dari
    // DATABASE_URL yang dipakai runtime. Fallback ke DATABASE_URL menjaga
    // perintah drizzle-kit tetap jalan di lingkungan tanpa pooler.
    url: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL,
  },
};
