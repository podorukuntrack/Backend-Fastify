import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS public.retention_complaints (
      id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      retention_id uuid NOT NULL REFERENCES public.retentions(id) ON DELETE CASCADE,
      description text,
      photo_before_url text,
      photo_after_url text,
      status character varying(50) DEFAULT 'pending',
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS retention_complaints_retention_idx ON public.retention_complaints USING btree (retention_id);`);
    console.log('Table retention_complaints created successfully.');
  } catch (error) {
    console.error('Error creating table:', error);
  }
  process.exit(0);
}

run();
