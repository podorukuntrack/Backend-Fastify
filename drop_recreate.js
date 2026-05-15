import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  console.log("Dropping old tables...");
  await sql`DROP TABLE IF EXISTS "handover_defects" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "handovers" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "retentions" CASCADE;`;

  console.log("Creating retentions table...");
  await sql`
    CREATE TABLE "retentions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "unit_id" uuid NOT NULL REFERENCES "units"("id"),
      "amount" numeric(15, 2),
      "due_date" timestamp NOT NULL,
      "status" varchar(50) DEFAULT 'active',
      "notes" text,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `;

  console.log("Creating handovers table...");
  await sql`
    CREATE TABLE "handovers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "unit_id" uuid NOT NULL REFERENCES "units"("id"),
      "scheduled_date" timestamp NOT NULL,
      "actual_date" timestamp,
      "status" varchar(50) DEFAULT 'scheduled',
      "notes" text,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `;

  console.log("Creating handover_defects table...");
  await sql`
    CREATE TABLE "handover_defects" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "handover_id" uuid NOT NULL REFERENCES "handovers"("id"),
      "description" text NOT NULL,
      "image_url" text,
      "status" varchar(50) DEFAULT 'reported',
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    );
  `;

  console.log("✅ All tables recreated successfully to match Drizzle schema!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
