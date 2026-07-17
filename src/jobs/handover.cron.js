import cron from 'node-cron';
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import { sendPushNotification } from '../shared/utils/notification.js';

export const startHandoverCron = () => {
  console.log('🕒 Starting Handover Reminder Cron Job...');
  
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Find handovers scheduled in the next 24 hours that haven't been reminded
      // 24 hours = 1440 minutes. We'll check between 23 and 24 hours to give a window.
      // But a simpler query: scheduled_date is less than 24 hours from now, and greater than now.
      const handovers24h = await db.execute(sql`
        SELECT h.id, h.scheduled_date, h.unit_id, u.nomor_unit as "nomorUnit"
        FROM handovers h
        JOIN units u ON h.unit_id = u.id
        WHERE h.status IN ('dijadwalkan', 'scheduled')
          AND h.reminder_24h_sent = false
          AND h.scheduled_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      `);

      const rows24h = handovers24h.rows || handovers24h;
      if (rows24h.length > 0) {
        const unitIds = rows24h.map(h => h.unit_id || h.unitId);
        const handoverIds = rows24h.map(h => h.id);
        
        const unitIdList = sql.join(unitIds.map(id => sql`${id}::uuid`), sql`, `);
        const assignmentsRes = await db.execute(sql`
          SELECT user_id, unit_id FROM property_assignments 
          WHERE unit_id IN (${unitIdList})
        `);
        const assignments = assignmentsRes.rows || assignmentsRes;
        
        const usersByUnit = {};
        for (const a of assignments) {
          const uId = a.unit_id || a.unitId;
          const usrId = a.user_id || a.userId;
          if (!usersByUnit[uId]) usersByUnit[uId] = [];
          usersByUnit[uId].push(usrId);
        }
        
        for (const h of rows24h) {
          const unitId = h.unit_id || h.unitId;
          const nomorUnit = h.nomorUnit || h.nomor_unit;
          const userIds = usersByUnit[unitId] || [];
          
          if (userIds.length > 0) {
            await sendPushNotification(
              userIds,
              'Pengingat Serah Terima (H-1)',
              `Besok adalah jadwal serah terima kunci untuk unit ${nomorUnit}. Harap bersiap!`,
              { type: 'handover_updated', handoverId: h.id, unitId: unitId }
            );
          }
        }
        
        const handoverIdList = sql.join(handoverIds.map(id => sql`${id}::uuid`), sql`, `);
        await db.execute(sql`UPDATE handovers SET reminder_24h_sent = true WHERE id IN (${handoverIdList})`);
      }

      // Find handovers scheduled in the next 2 hours that haven't been reminded
      const handovers2h = await db.execute(sql`
        SELECT h.id, h.scheduled_date, h.unit_id, u.nomor_unit as "nomorUnit"
        FROM handovers h
        JOIN units u ON h.unit_id = u.id
        WHERE h.status IN ('dijadwalkan', 'scheduled')
          AND h.reminder_2h_sent = false
          AND h.scheduled_date BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
      `);

      const rows2h = handovers2h.rows || handovers2h;
      if (rows2h.length > 0) {
        const unitIds = rows2h.map(h => h.unit_id || h.unitId);
        const handoverIds = rows2h.map(h => h.id);
        
        const unitIdList = sql.join(unitIds.map(id => sql`${id}::uuid`), sql`, `);
        const assignmentsRes = await db.execute(sql`
          SELECT user_id, unit_id FROM property_assignments 
          WHERE unit_id IN (${unitIdList})
        `);
        const assignments = assignmentsRes.rows || assignmentsRes;
        
        const usersByUnit = {};
        for (const a of assignments) {
          const uId = a.unit_id || a.unitId;
          const usrId = a.user_id || a.userId;
          if (!usersByUnit[uId]) usersByUnit[uId] = [];
          usersByUnit[uId].push(usrId);
        }
        
        for (const h of rows2h) {
          const unitId = h.unit_id || h.unitId;
          const nomorUnit = h.nomorUnit || h.nomor_unit;
          const userIds = usersByUnit[unitId] || [];
          
          if (userIds.length > 0) {
            await sendPushNotification(
              userIds,
              'Pengingat Serah Terima (2 Jam Lagi)',
              `Dalam 2 jam lagi, jadwal serah terima kunci unit ${nomorUnit} akan dimulai!`,
              { type: 'handover_updated', handoverId: h.id, unitId: unitId }
            );
          }
        }
        
        const handoverIdList = sql.join(handoverIds.map(id => sql`${id}::uuid`), sql`, `);
        await db.execute(sql`UPDATE handovers SET reminder_2h_sent = true WHERE id IN (${handoverIdList})`);
      }
      
    } catch (error) {
      console.error('Handover Reminder Cron Error:', error);
    }
  });
};
