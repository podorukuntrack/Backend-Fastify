import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_history'`;
  console.log(rows);
  process.exit(0);
}
run().catch(console.error);
run().catch(console.error);
