import { db } from './src/shared/utils/db.js';

async function run() {
  const res = await db.execute('SELECT event_object_table, trigger_name, event_manipulation, action_statement FROM information_schema.triggers;');
  console.log(res);
  process.exit(0);
}
run();
