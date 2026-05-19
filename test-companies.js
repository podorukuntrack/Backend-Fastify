import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const companies = await sql`SELECT id, nama_pt, kode_pt, theme_color, logo_url FROM companies`;
    console.log("All companies in DB:", companies);
  } catch (err) {
    console.error("DB Error:", err.message);
  }
  process.exit(0);
}

run();
