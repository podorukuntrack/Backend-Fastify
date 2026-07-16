import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  const rows = await sql`SELECT nama, email, role FROM users`;
  console.log(rows);
  process.exit(0);
}
run().catch(console.error);
