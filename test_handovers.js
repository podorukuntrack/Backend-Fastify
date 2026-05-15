import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    const handovers = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'handovers'`;
    console.log("Handovers columns:", handovers.map(r => r.column_name));

    const retentions = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'retentions'`;
    console.log("Retentions columns:", retentions.map(r => r.column_name));
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}

main();
