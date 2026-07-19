import * as repo from './payment.repository.js';
import { findUnitById } from '../units/unit.repository.js';
import { AppError } from '../../shared/utils/AppError.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import { sendPushNotification } from '../../shared/utils/notification.js';

export const getPayments = async (userContext) => {
  return await repo.findAllPayments(userContext);
};

export const getPaymentsByUnit = async (unitId, userContext) => {
  return await repo.findPaymentsByUnitId(unitId, userContext);
};

export const createPayment = async (data, userContext) => {
  if (userContext.companyId) data.companyId = userContext.companyId;
  const unit = await findUnitById(data.unitId, userContext);
  if (!unit) throw new AppError('Data unit tidak ditemukan atau Anda tidak memiliki akses.', 404);
  
  const result = await repo.insertPayment(data);

  // Trigger push notification for non-KPR payments
  try {
    const assignments = await db.execute(sql`
      SELECT user_id, tipe_pembayaran FROM property_assignments WHERE unit_id = ${data.unitId}::uuid
    `);
    
    // We only send if tipe_pembayaran is NOT 'kredit_kpr'
    // Since an assignment could be multiple, we filter them.
    const eligibleAssignments = assignments.filter(a => a.tipe_pembayaran !== 'kredit_kpr');
    const userIds = eligibleAssignments.map(a => a.user_id ?? a.userId);
    
    if (userIds.length > 0) {
      const unitNo = unit.nomor_unit ?? unit.nomorUnit ?? data.unitId;
      const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(data.amount ?? data.jumlah);
      
      await sendPushNotification(
        userIds,
        'Progres Pembayaran Masuk',
        `Pembayaran sebesar ${amountStr} untuk unit ${unitNo} telah dikonfirmasi.`,
        { type: 'payment_progress', unitId: data.unitId, paymentId: result.id }
      );
    }
  } catch (e) {
    console.error('Failed to trigger payment progress push notification:', e.message);
  }

  return result;
};