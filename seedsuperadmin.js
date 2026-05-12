// src/scripts/seed.js
import { db } from './src/config/database.js';
import { users } from './src/shared/schemas/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load env vars karena script ini dijalankan terpisah dari server
dotenv.config();

async function runSeeder() {
  console.log('⏳ Memulai proses Database Seeding...');

  try {
    // 1. Cek apakah super_admin sudah ada di database
    const existingAdmin = await db.select().from(users).where(eq(users.role, 'super_admin')).limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Akun Super Admin sudah ada. Seeding dihentikan.');
      process.exit(0);
    }

    // 2. Siapkan data kredensial
    const adminEmail = 'super@admin.id'; // Ganti dengan email pilihanmu
    const adminPassword = '123456'; // Ganti dengan password yang kuat

    // 3. Hash password menggunakan bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // 4. Masukkan ke database
    await db.insert(users).values({
      nama: 'Global Super Admin',
      email: adminEmail,
      password_hash: hashedPassword,
      role: 'super_admin',
      companyId: null // super_admin tidak terikat ke company manapun
    });

    console.log('🎉 Super Admin berhasil dibuat!');
    console.log(`✉️  Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat seeding:', error);
    process.exit(1);
  }
}

runSeeder();