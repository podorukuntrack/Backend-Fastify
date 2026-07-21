import 'dotenv/config'; 
import { executeKprReminderJob } from './src/jobs/kpr-reminder.cron.js'; 

// Override console.log/error to see specifically if c20d4124-5651-4527-97f5-9ebb5052395d is processed
console.log("Triggering KPR Reminder untuk semua yang memenuhi syarat...");
await executeKprReminderJob(); 
console.log('Selesai diproses.'); 
process.exit(0);
