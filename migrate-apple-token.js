import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Menambahkan kolom apple_refresh_token ke tabel users dengan aman...");
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_refresh_token text;`);
    console.log("BERHASIL! Kolom apple_refresh_token sudah ditambahkan.");
    process.exit(0);
  } catch (err) {
    console.error("Gagal menambahkan kolom:", err);
    process.exit(1);
  }
}

run();
