import * as repo from './retention.repository.js';
import { findUnitById } from '../units/unit.repository.js';
import { sendPushNotification } from '../../shared/utils/notification.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

const normalizeInput = (data) => {
  if (!data) return data;
  return {
    ...data,
    unitId: data.unitId ?? data.unit_id,
    dueDate: data.dueDate ?? data.due_date,
    companyId: data.companyId ?? data.company_id,
  };
};

export const getRetentionsList = async (userContext, filters = {}) => {
  return await repo.findRetentions(userContext, normalizeInput(filters));
};

export const getRetentionDetail = async (id, userContext) => {
  const retention = await repo.findRetentionById(id, userContext);
  if (!retention) throw new Error('Retention not found or access denied');
  return retention;
};

export const createRetention = async (input, userContext) => {
  const data = normalizeInput(input);
  const unit = await findUnitById(data.unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  
  if (!data.companyId) {
    data.companyId = userContext.companyId ?? unit.companyId ?? unit.company_id;
  }
  const result = await repo.insertRetention(data);

  // Kirim Notifikasi Realtime ketika retensi dibuat
  try {
    const assignments = await db.execute(sql`
      SELECT user_id FROM property_assignments WHERE unit_id = ${data.unitId}::uuid
    `);
    const userIds = assignments.map(a => a.user_id ?? a.userId);
    if (userIds.length > 0 && unit) {
      const unitNo = unit.nomor_unit ?? unit.nomorUnit;
      const formattedDate = data.dueDate 
        ? new Date(data.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : '';
      await sendPushNotification(
        userIds,
        'Masa Garansi Rumah (Retensi) Dimulai',
        `Masa garansi / retensi untuk unit ${unitNo} telah diaktifkan sampai tanggal ${formattedDate}.`,
        { type: 'retention_created', retentionId: result.id }
      );
    }
  } catch (e) {
    console.error('Failed to trigger retention create push notification:', e.message);
  }

  return result;
};

export const modifyRetention = async (id, input, userContext) => {
  const result = await repo.updateRetention(id, normalizeInput(input), userContext);
  if (!result) throw new Error('Retention not found or access denied');

  // Kirim Notifikasi Realtime ketika status retensi di-update
  try {
    const targetUnitId = result.unit_id ?? result.unitId;
    const unit = await findUnitById(targetUnitId, userContext);
    const assignments = await db.execute(sql`
      SELECT user_id FROM property_assignments WHERE unit_id = ${targetUnitId}::uuid
    `);
    const userIds = assignments.map(a => a.user_id ?? a.userId);

    if (userIds.length > 0 && unit) {
      const unitNo = unit.nomor_unit ?? unit.nomorUnit;
      let title = 'Pembaruan Garansi Rumah (Retensi)';
      let body = `Status garansi untuk unit ${unitNo} telah diubah menjadi: ${result.status}.`;

      if (result.status === 'released') {
        title = 'Masa Garansi Rumah Sudah Selesai';
        body = `Masa garansi / retensi untuk unit ${unitNo} telah selesai / dirilis.`;
      } else if (result.status === 'claimed') {
        title = 'Klaim Garansi Rumah (Retensi)';
        body = `Klaim garansi untuk unit ${unitNo} telah diproses (Status: Klaim).`;
      }

      await sendPushNotification(
        userIds,
        title,
        body,
        { type: 'retention_updated', retentionId: id }
      );
    }
  } catch (e) {
    console.error('Failed to trigger retention modify push notification:', e.message);
  }

  return result;
};

export const removeRetention = async (id, userContext) => {
  const result = await repo.deleteRetention(id, userContext);
  if (!result) throw new Error('Retention not found or access denied');
  return result;
};