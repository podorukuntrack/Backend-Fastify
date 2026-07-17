import cron from 'node-cron';
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import { sendPushNotification } from '../shared/utils/notification.js';

export const startKprReminderCron = () => {
  console.log('🕒 Starting KPR Reminder Cron Job...');
  
  // Run daily at 12:00 PM WIB (Asia/Jakarta)
  cron.schedule('0 12 * * *', async () => {
    try {
      // Get today's date in YYYY-MM-DD in Asia/Jakarta timezone
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
      
      const assignments = await db.execute(sql`
        SELECT 
          pa.id, 
          pa.unit_id, 
          pa.user_id, 
          pa.reminder_kpr_dates,
          pa.jatuh_tempo_kpr,
          u.nomor_unit
        FROM property_assignments pa
        JOIN units u ON pa.unit_id = u.id
        WHERE pa.status_kepemilikan = 'active'
          AND pa.tipe_pembayaran = 'kredit_kpr'
          AND pa.total_dibayar < pa.harga_total
          AND pa.reminder_kpr_dates IS NOT NULL
          AND jsonb_array_length(pa.reminder_kpr_dates) > 0
      `);

      const rows = assignments.rows || assignments;

      for (const row of rows) {
        let dates = row.reminder_kpr_dates || [];
        let updated = false;

        for (let i = 0; i < dates.length; i++) {
          if (dates[i].date === todayStr && !dates[i].sent) {
            
            // Calculate days before due date
            const dueDate = new Date(row.jatuh_tempo_kpr);
            const reminderDate = new Date(todayStr);
            const timeDiff = dueDate.getTime() - reminderDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            let reminderText = `Jatuh tempo KPR Anda untuk unit ${row.nomor_unit} tinggal ${daysDiff} hari lagi (pada ${dueDate.toLocaleDateString('id-ID')}).`;
            if (daysDiff === 0) reminderText = `Jatuh tempo KPR Anda untuk unit ${row.nomor_unit} adalah HARI INI!`;
            if (daysDiff < 0) reminderText = `Jatuh tempo KPR Anda untuk unit ${row.nomor_unit} telah lewat.`;
            
            await sendPushNotification(
              [row.user_id],
              'Pengingat Jatuh Tempo KPR',
              reminderText,
              { type: 'kpr_reminder', assignmentId: row.id, unitId: row.unit_id }
            );

            dates[i].sent = true;
            updated = true;
          }
        }

        if (updated) {
          const newDatesJson = JSON.stringify(dates);
          await db.execute(sql`
            UPDATE property_assignments 
            SET reminder_kpr_dates = ${newDatesJson}::jsonb 
            WHERE id = ${row.id}
          `);
        }
      }
    } catch (error) {
      console.error('KPR Reminder Cron Error:', error);
    }
  }, {
    timezone: "Asia/Jakarta"
  });
};
