import { db } from './src/config/database.js';
import { sql } from 'drizzle-orm';
import { updateAssignment, insertAssignment } from './src/modules/assignments/assignment.repository.js';

async function test() {
  try {
    const arr = [15, 20];
    const assignments = await db.execute(sql`SELECT * FROM property_assignments LIMIT 1`);
    if (assignments.rows && assignments.rows.length > 0) {
      const id = assignments.rows[0].id;
      console.log('Testing updateAssignment...');
      await updateAssignment(id, { reminder_kpr_dates: arr });
      console.log('OK updateAssignment');
    }
  } catch(e) { 
    console.error('Error:', e); 
  }
  process.exit(0);
}
test();
