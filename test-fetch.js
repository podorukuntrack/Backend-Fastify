import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  const docs = await sql`SELECT id, nama_file, url FROM documentation ORDER BY created_at DESC LIMIT 5`;
  console.log("Recent documents:", docs);
  
  if (docs.length > 0) {
    const url = docs[0].url;
    console.log("Fetching URL:", url);
    try {
      const fetchRes = await fetch(url);
      console.log("Status:", fetchRes.status);
      console.log("Headers:", fetchRes.headers);
      if (!fetchRes.ok) {
        console.log("Text:", await fetchRes.text());
      }
    } catch (e) {
      console.error("Fetch error:", e.message);
    }
  }
  process.exit(0);
}

run();
