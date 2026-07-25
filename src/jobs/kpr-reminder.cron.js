import cron from 'node-cron';
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import { sendPushNotification } from '../shared/utils/notification.js';

export const executeKprReminderJob = async () => {
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
          pa.tipe_pembayaran,
          u.nomor_unit
        FROM property_assignments pa
        JOIN units u ON pa.unit_id = u.id
        WHERE pa.status_kepemilikan = 'active'
          AND pa.tipe_pembayaran IN ('kredit_kpr', 'cash_cicil')
          AND pa.total_dibayar < pa.harga_total
          AND pa.jatuh_tempo_kpr IS NOT NULL
      `);

      const rows = assignments.rows || assignments;

      for (const row of rows) {
        let dates = Array.isArray(row.reminder_kpr_dates) ? row.reminder_kpr_dates : [];

        const dueDateStr = new Date(row.jatuh_tempo_kpr).toISOString().split('T')[0];
        const dueDateObj = new Date(dueDateStr);
        const todayObj = new Date(todayStr);
        const timeDiff = dueDateObj.getTime() - todayObj.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        let shouldSend = false;
        let reminderText = '';

        const isCashCicil = row.tipe_pembayaran === 'cash_cicil';
        const typeName = isCashCicil ? 'Cash Cicil' : 'KPR';

        // 1. Check custom dates
        const currentDay = todayObj.getDate();
        if (dates.includes(currentDay)) {
          shouldSend = true;
          const dueMsg = daysDiff > 0 ? `tinggal ${daysDiff} hari lagi` : (daysDiff === 0 ? "adalah HARI INI" : `telah lewat ${Math.abs(daysDiff)} hari`);
          reminderText = `Pengingat bulanan pembayaran ${typeName} unit ${row.nomor_unit}. Jatuh tempo ${dueMsg}. Harap lakukan pembayaran jika belum.`;
        }

        // 2. Check D-Day (Hari H)
        if (daysDiff === 0) {
          shouldSend = true;
          reminderText = `Jatuh tempo pembayaran ${typeName} Anda untuk unit ${row.nomor_unit} adalah HARI INI!`;
        }

        // 3. Check Overdue (Hari lewat)
        if (daysDiff < 0) {
          shouldSend = true;
          // You might want to make it daily, or specific days. Since cron runs daily, this sends every day.
          reminderText = `Jatuh tempo pembayaran ${typeName} Anda untuk unit ${row.nomor_unit} telah lewat ${Math.abs(daysDiff)} hari. Harap segera lakukan pembayaran.`;
        }

        if (shouldSend) {
          await sendPushNotification(
            [row.user_id],
            `Pengingat Jatuh Tempo ${typeName}`,
            reminderText,
            { type: 'kpr_reminder', assignmentId: row.id, unitId: row.unit_id }
          );
        }

        // No DB update needed for repeating dates
      }
  } catch (error) {
    console.error('KPR Reminder Cron Error:', error);
  }
};

export const startKprReminderCron = () => {
  console.log('🕒 Starting KPR Reminder Cron Job...');
  
  // Run daily at 12:00 PM WIB (Asia/Jakarta)
  cron.schedule('0 12 * * *', executeKprReminderJob, {
    timezone: "Asia/Jakarta"
  });
};
