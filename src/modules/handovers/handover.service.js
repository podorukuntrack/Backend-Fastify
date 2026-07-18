import * as repo from './handover.repository.js';
import { findUnitById } from '../units/unit.repository.js';
import { sendPushNotification } from '../../shared/utils/notification.js';
import { sendHandoverNotification } from '../../shared/utils/mailer.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import { users } from '../../shared/schemas/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { sendWhatsAppMessage } from '../whatsapp/whatsapp.service.js';
import { AppError } from '../../shared/utils/AppError.js';

const normalizeInput = (data) => {
  const normalized = { ...data };
  if (data.unit_id) normalized.unitId = data.unit_id;
  if (data.company_id) normalized.companyId = data.company_id;
  if (data.scheduled_date) normalized.scheduledDate = data.scheduled_date;
  if (data.proposed_date) normalized.proposedDate = data.proposed_date;
  if (data.actual_date) normalized.actualDate = data.actual_date;
  if (data.image_url !== undefined) normalized.imageUrl = data.image_url;
  return normalized;
};

export const getHandovers = async (userContext, filters = {}) => {
  return await repo.findHandovers(userContext, filters);
};

export const getHandover = async (id, userContext) => {
  const handover = await repo.findHandoverById(id, userContext);
  if (!handover) throw new AppError('Data serah terima tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return handover;
};

export const createHandover = async (data, userContext) => {
  const normalizedData = normalizeInput(data);
  const unit = await findUnitById(normalizedData.unitId, userContext);
  if (!unit) throw new AppError('Data unit tidak ditemukan atau Anda tidak memiliki akses.', 404);
  
  if (!normalizedData.companyId) {
    normalizedData.companyId = userContext.companyId ?? unit.companyId ?? unit.company_id;
  }

  // Cek apakah sudah ada data serah terima yang aktif atau berhasil
  const existingHandovers = await repo.findHandovers(userContext, { unitId: normalizedData.unitId });
  const hasActiveOrCompleted = existingHandovers.some(h => h.status !== 'gagal');
  if (hasActiveOrCompleted) {
    throw new AppError('Gagal. Terdapat jadwal serah terima yang sedang aktif atau sudah selesai untuk unit ini.', 400);
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
        { type: 'handover_created', handoverId: result.id, unitId: normalizedData.unitId }
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
  if (!result) throw new AppError('Data serah terima tidak ditemukan atau Anda tidak memiliki akses.', 404);

  try {
    const targetUnitId = result.unit_id ?? result.unitId;
    const unit = await findUnitById(targetUnitId, userContext);
    const assignments = await db.execute(sql`
      SELECT user_id FROM property_assignments WHERE unit_id = ${targetUnitId}::uuid
    `);
    const userIds = assignments.map(a => a.user_id ?? a.userId);
    
    if (userIds.length > 0 && unit) {
      let title = 'Pembaruan Status Serah Terima';
      let body = `Status serah terima untuk unit ${unit.nomor_unit ?? unit.nomorUnit} telah diubah menjadi: ${result.status}.`;
      
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
      } else if (result.status === 'dijadwalkan' || result.status === 'scheduled' || result.status === 'menunggu_respon_customer') {
        title = 'Jadwal Serah Terima Rumah Dijadwalkan';
        body = `Jadwal serah terima unit ${unit.nomor_unit ?? unit.nomorUnit} Anda telah ditetapkan. Silakan lakukan konfirmasi di aplikasi.`;
      } else if (result.status === 'selesai' || result.status === 'completed') {
        title = 'Proses Serah Terima Selesai';
        body = `Selamat! Proses serah terima kunci untuk unit ${unit.nomor_unit ?? unit.nomorUnit} telah selesai dilakukan secara resmi.`;
      }
      
      if (userContext.role === 'customer') {
        const adminUsers = await db
          .select({ id: users.id, email: users.email, nomor_telepon: users.nomor_telepon })
          .from(users)
          .where(
            and(
              eq(users.company_id, result.company_id ?? result.companyId),
              inArray(users.role, ['admin'])
            )
          );
        
        let proposedDateText = '';
        if (normalizedData.proposedDate) {
          try {
            const d = new Date(normalizedData.proposedDate);
            proposedDateText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
          } catch (e) {
            proposedDateText = normalizedData.proposedDate;
          }
        }

        const adminIds = adminUsers.map(u => u.id);
        const adminEmails = adminUsers.map(u => u.email).filter(Boolean);
        const adminPhones = adminUsers.map(u => u.nomor_telepon).filter(Boolean);
        
        const frontendUrl = (process.env.FRONTEND_URL || 'https://podorukuntrack.com').split(',')[0].trim();
        const projectId = unit?.cluster?.project?.id || '';
        const clusterId = unit?.cluster_id || unit?.clusterId || '';
        const unitNo = unit?.nomor_unit || unit?.nomorUnit || '';
        const actionUrl = `${frontendUrl}/projects/${projectId}/clusters/${clusterId}/units/${unit.id}?tab=handover`;

        // WA Message Logic
        let waMessage = '';
        const isAccepted = result.status === 'dijadwalkan' || result.status === 'scheduled';
        const statusText = isAccepted ? 'Menerima Jadwal' : result.status;
        
        if (proposedDateText) {
          waMessage = `*Notifikasi Serah Terima*\n\nHalo Admin,\nCustomer unit *${unitNo}* telah mengajukan perubahan jadwal serah terima menjadi tanggal *${proposedDateText}*.\n\nSilakan klik tautan di bawah ini untuk melihat detailnya:\n${actionUrl}`;
        } else {
          waMessage = `*Notifikasi Serah Terima*\n\nHalo Admin,\nCustomer unit *${unitNo}* telah merespons jadwal serah terima dengan status: *${statusText.toUpperCase()}*.\n\nSilakan klik tautan di bawah ini untuk melihat detailnya:\n${actionUrl}`;
        }

        if (adminPhones.length > 0) {
          adminPhones.forEach(phone => {
             sendWhatsAppMessage(phone, waMessage, userContext).catch(console.error);
          });
        }

        if (adminIds.length > 0) {
          await sendPushNotification(
            adminIds,
            `Respon Serah Terima dari Customer`,
            `Customer telah menanggapi jadwal serah terima unit ${unitNo} (Status: ${result.status}).`,
            { type: 'handover_updated', handoverId: id, unitId: targetUnitId }
          );
        }

        if (adminEmails.length > 0) {
          sendHandoverNotification(adminEmails, {
            handoverId: id,
            unitNumber: unitNo,
            status: result.status,
            proposedDateText,
            projectId,
            clusterId,
            unitId: unit.id
          });
        }
      } else {
        await sendPushNotification(
          userIds,
          title,
          body,
          { type: 'handover_updated', handoverId: id, unitId: targetUnitId }
        );
      }
    }
  } catch (e) {
    console.error('Failed to trigger handover modify push notification:', e.message);
  }

  return result;
};

export const removeHandover = async (id, userContext) => {
  const handover = await repo.findHandoverById(id, userContext);
  if (!handover) throw new AppError('Data serah terima tidak ditemukan atau Anda tidak memiliki akses.', 404);
  
  const result = await repo.deleteHandover(id, userContext);
  return result;
};

export const reportDefect = async (handoverId, data, userContext) => {
  const handover = await repo.findHandoverById(handoverId, userContext);
  if (!handover) throw new AppError('Data serah terima tidak ditemukan atau Anda tidak memiliki akses.', 404);
  
  data.handoverId = handoverId;
  const result = await repo.insertDefect(data);

  try {
    const unit = await findUnitById(handover.unit_id ?? handover.unitId, userContext);
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.companyId, handover.company_id ?? handover.companyId),
          inArray(users.role, ['admin'])
        )
      );
    const adminIds = adminUsers.map(u => u.id);
    if (adminIds.length > 0 && unit) {
      await sendPushNotification(
        adminIds,
        `Laporan Defect Baru (Komplain Unit)`,
        `Laporan komplain unit/defect baru diajukan untuk unit ${unit.nomor_unit ?? unit.nomorUnit}: ${data.description}.`,
        { type: 'defect_reported', handoverId, unitId: handover.unit_id ?? handover.unitId }
      );
    }
  } catch (e) {
    console.error('Failed to trigger defect report push notification:', e.message);
  }

  return result;
};