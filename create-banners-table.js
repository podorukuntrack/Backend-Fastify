import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS public.banners (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        image_url text NOT NULL,
        link_url text,
        is_active varchar(20) DEFAULT 'true',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS banners_company_idx ON public.banners USING btree (company_id);
    `);
    console.log("Table banners created successfully.");
  } catch (error) {
    console.error("Error:", error.message);
  }
  process.exit(0);
}

run();
