import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  console.log("Dropping old timelines table...");
  await sql`DROP TABLE IF EXISTS "timelines" CASCADE;`;

  console.log("Creating timelines table...");
  await sql`
    CREATE TABLE "timelines" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "project_id" uuid NOT NULL REFERENCES "projects"("id"),
      "unit_id" uuid NOT NULL REFERENCES "units"("id"),
      "task_name" varchar(255) NOT NULL,
      "start_date" timestamp NOT NULL,
      "end_date" timestamp NOT NULL,
      "status" varchar(50) DEFAULT 'planned',
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `;

  console.log("✅ Timelines table recreated successfully with unit_id!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
