import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  const rows = await sql`SELECT role, count(*) FROM users GROUP BY role`;
  console.log(rows);
  process.exit(0);
}
run().catch(console.error);
run().catch(console.error);
