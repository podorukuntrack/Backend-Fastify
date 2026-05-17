import * as repo from './handover.repository.js';
import { findUnitById } from '../units/unit.repository.js';

const normalizeInput = (data) => {
  const normalized = { ...data };
  if (data.unit_id) normalized.unitId = data.unit_id;
  if (data.company_id) normalized.companyId = data.company_id;
  if (data.scheduled_date) normalized.scheduledDate = data.scheduled_date;
  if (data.proposed_date) normalized.proposedDate = data.proposed_date;
  if (data.actual_date) normalized.actualDate = data.actual_date;
  return normalized;
};

export const getHandovers = async (userContext, filters = {}) => {
  return await repo.findHandovers(userContext, filters);
};

export const getHandover = async (id, userContext) => {
  const handover = await repo.findHandoverById(id, userContext);
  if (!handover) throw new Error('Handover not found or access denied');
  return handover;
};

import { sendPushNotification } from '../../shared/utils/notification.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import { users } from '../../shared/schemas/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export const createHandover = async (data, userContext) => {
  const normalizedData = normalizeInput(data);
  const unit = await findUnitById(normalizedData.unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  
  if (!normalizedData.companyId) {
    normalizedData.companyId = userContext.companyId ?? unit.companyId ?? unit.company_id;
  }
  const result = await repo.insertHandover(normalizedData);

  try {
    const assignments = await db.execute(sql`
      SELECT user_id FROM property_assignments WHERE unit_id = ${normalizedData.unitId}::uuid
    `);
    const userIds = assignments.map(a => a.user_id ?? a.userId);
    if (userIds.length > 0) {
      await sendPushNotification(
        userIds,
        'Jadwal Serah Terima Unit (Handover)',
        `Jadwal serah terima kunci untuk unit ${unit.nomor_unit ?? unit.nomorUnit} telah dibuat. Silakan cek detailnya di menu Serah Terima.`,
        { type: 'handover_created', handoverId: result.id }
      );
    }
  } catch (e) {
    console.error('Failed to trigger handover create push notification:', e.message);
  }

  return result;
};

export const modifyHandover = async (id, data, userContext) => {
  const normalizedData = normalizeInput(data);
  const result = await repo.updateHandover(id, normalizedData, userContext);
  if (!result) throw new Error('Handover not found or access denied');

  try {
    const handover = await repo.findHandoverById(id, userContext);
    if (handover) {
      const targetUnitId = handover.unit_id ?? handover.unitId;
      const unit = await findUnitById(targetUnitId, userContext);
      const assignments = await db.execute(sql`
        SELECT user_id FROM property_assignments WHERE unit_id = ${targetUnitId}::uuid
      `);
      const userIds = assignments.map(a => a.user_id ?? a.userId);
      
      if (userIds.length > 0 && unit) {
        let title = 'Pembaruan Status Serah Terima';
        let body = `Status serah terima untuk unit ${unit.nomor_unit ?? unit.nomorUnit} telah diubah menjadi: ${handover.status}.`;
        
        if (normalizedData.scheduledDate) {
          try {
            const dateObj = new Date(normalizedData.scheduledDate);
            const formattedDate = dateObj.toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            });
            const formattedTime = dateObj.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit'
            });
            title = 'Penyesuaian Jadwal Serah Terima';
            body = `Jadwal serah terima unit ${unit.nomor_unit ?? unit.nomorUnit} Anda disesuaikan menjadi tanggal ${formattedDate} pukul ${formattedTime} WIB.`;
          } catch (_) {
            title = 'Penyesuaian Jadwal Serah Terima';
            body = `Ada penyesuaian jadwal serah terima unit ${unit.nomor_unit ?? unit.nomorUnit}. Silakan cek di aplikasi.`;
          }
        } else if (handover.status === 'dijadwalkan' || handover.status === 'scheduled' || handover.status === 'menunggu_respon_customer') {
          title = 'Jadwal Serah Terima Rumah Dijadwalkan';
          body = `Jadwal serah terima unit ${unit.nomor_unit ?? unit.nomorUnit} Anda telah ditetapkan. Silakan lakukan konfirmasi di aplikasi.`;
        } else if (handover.status === 'selesai' || handover.status === 'completed') {
          title = 'Proses Serah Terima Selesai';
          body = `Selamat! Proses serah terima kunci untuk unit ${unit.nomor_unit ?? unit.nomorUnit} telah selesai dilakukan secara resmi.`;
        }
        
        if (userContext.role === 'customer') {
          const adminUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(
              and(
                eq(users.companyId, handover.companyId),
                inArray(users.role, ['admin', 'customer_service'])
              )
            );
          const adminIds = adminUsers.map(u => u.id);
          if (adminIds.length > 0) {
            await sendPushNotification(
              adminIds,
              `Respon Serah Terima dari Customer`,
              `Customer telah menanggapi jadwal serah terima unit ${unit.nomor_unit ?? unit.nomorUnit} (Status: ${handover.status}).`,
              { type: 'handover_updated', handoverId: id }
            );
          }
        } else {
          await sendPushNotification(
            userIds,
            title,
            body,
            { type: 'handover_updated', handoverId: id }
          );
        }
      }
    }
  } catch (e) {
    console.error('Failed to trigger handover modify push notification:', e.message);
  }

  return result;
};

export const reportDefect = async (handoverId, data, userContext) => {
  const handover = await repo.findHandoverById(handoverId, userContext);
  if (!handover) throw new Error('Handover not found or access denied');
  
  data.handoverId = handoverId;
  const result = await repo.insertDefect(data);

  try {
    const unit = await findUnitById(handover.unitId, userContext);
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.companyId, handover.companyId),
          inArray(users.role, ['admin', 'customer_service'])
        )
      );
    const adminIds = adminUsers.map(u => u.id);
    if (adminIds.length > 0 && unit) {
      await sendPushNotification(
        adminIds,
        `Laporan Defect Baru (Komplain Unit)`,
        `Laporan komplain unit/defect baru diajukan untuk unit ${unit.nomor_unit ?? unit.nomorUnit}: ${data.description}.`,
        { type: 'defect_reported', handoverId }
      );
    }
  } catch (e) {
    console.error('Failed to trigger defect report push notification:', e.message);
  }

  return result;
};