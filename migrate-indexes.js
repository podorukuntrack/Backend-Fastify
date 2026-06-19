import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function run() {
  try {
    console.log('Applying database indexes...');
    
    const queries = [
      'CREATE INDEX IF NOT EXISTS "assignments_company_idx" ON "assignments" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "assignments_project_idx" ON "assignments" USING btree ("project_id");',
      
      'CREATE INDEX IF NOT EXISTS "clusters_company_idx" ON "clusters" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "clusters_project_idx" ON "clusters" USING btree ("project_id");',
      
      'CREATE INDEX IF NOT EXISTS "docs_company_idx" ON "documentations" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "docs_unit_idx" ON "documentations" USING btree ("unit_id");',
      'CREATE INDEX IF NOT EXISTS "docs_progress_idx" ON "documentations" USING btree ("progress_id");',
      
      'CREATE INDEX IF NOT EXISTS "defects_handover_idx" ON "handover_defects" USING btree ("handover_id");',
      
      'CREATE INDEX IF NOT EXISTS "handovers_company_idx" ON "handovers" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "handovers_unit_idx" ON "handovers" USING btree ("unit_id");',
      
      'CREATE INDEX IF NOT EXISTS "payments_company_idx" ON "payments" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "payments_unit_idx" ON "payments" USING btree ("unit_id");',
      
      'CREATE INDEX IF NOT EXISTS "progress_unit_idx" ON "progress" USING btree ("unit_id");',
      'CREATE INDEX IF NOT EXISTS "projects_company_idx" ON "projects" USING btree ("company_id");',
      
      'CREATE INDEX IF NOT EXISTS "rt_user_idx" ON "refresh_tokens" USING btree ("user_id");',
      
      'CREATE INDEX IF NOT EXISTS "retentions_company_idx" ON "retentions" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "retentions_unit_idx" ON "retentions" USING btree ("unit_id");',
      
      'CREATE INDEX IF NOT EXISTS "tm_ticket_idx" ON "ticket_messages" USING btree ("ticket_id");',
      'CREATE INDEX IF NOT EXISTS "tickets_company_idx" ON "tickets" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "tickets_user_idx" ON "tickets" USING btree ("user_id");',
      
      'CREATE INDEX IF NOT EXISTS "timelines_company_idx" ON "timelines" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "timelines_project_idx" ON "timelines" USING btree ("project_id");',
      'CREATE INDEX IF NOT EXISTS "timelines_unit_idx" ON "timelines" USING btree ("unit_id");',
      
      'CREATE INDEX IF NOT EXISTS "units_cluster_idx" ON "units" USING btree ("cluster_id");',
      'CREATE INDEX IF NOT EXISTS "devices_user_idx" ON "user_devices" USING btree ("user_id");',
      'CREATE INDEX IF NOT EXISTS "users_company_idx" ON "users" USING btree ("company_id");',
      
      'CREATE INDEX IF NOT EXISTS "wa_company_idx" ON "whatsapp_logs" USING btree ("company_id");',
      'CREATE INDEX IF NOT EXISTS "wa_user_idx" ON "whatsapp_logs" USING btree ("user_id");'
    ];

    for (const q of queries) {
      console.log(`Executing: ${q}`);
      try {
        await sql.unsafe(q);
      } catch (err) {
        console.error(`Failed on query: ${q}`);
        console.error(err.message);
      }
    }
    
    console.log('✅ Indexes applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

run();
