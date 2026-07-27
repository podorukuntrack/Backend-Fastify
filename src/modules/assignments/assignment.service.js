import * as repo from './assignment.repository.js';
import { sendPushNotification } from '../../shared/utils/notification.js';

export const getAssignments = async (userContext, filters = {}) => {
  return await repo.findAllAssignments(userContext, filters);
};

export const getAssignmentsMeta = async (filters, userContext) => {
  return await repo.countAssignments(filters, userContext);
};

export const getAssignment = async (id, userContext) => {
  const assignment = await repo.findAssignmentById(id, userContext);
  if (!assignment) throw new AppError('Data penugasan tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return assignment;
};

import * as unitRepo from '../units/unit.repository.js';
import { AppError } from '../../shared/utils/AppError.js';

export const createAssignment = async (data, userContext) => {
  const unit = await unitRepo.findUnitById(data.unit_id, userContext);
  if (!unit) throw new AppError('Data unit tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return await repo.insertAssignment(data, userContext);
};

export const modifyAssignment = async (id, data, userContext) => {
  const result = await repo.updateAssignment(id, data, userContext);
  if (!result) throw new AppError('Data penugasan tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return result;
};

export const getAssignmentPayments = async (id, userContext) => {
  const result = await repo.findPaymentsByAssignmentId(id, userContext);
  if (!result) throw new AppError('Data penugasan tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return result;
};

export const createAssignmentPayment = async (id, data, userContext) => {
  const result = await repo.insertPayment(id, data, userContext);
  if (!result) throw new AppError('Data penugasan tidak ditemukan atau Anda tidak memiliki akses.', 404);

  // Kirim notifikasi push ke pelanggan
  try {
    const assignment = await repo.findAssignmentById(id, userContext);
    if (assignment) {
      const userId = assignment.user?.id;
      const nomorUnit = assignment.unit?.nomor_unit ?? id;
      const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.jumlah_bayar ?? 0);

      if (userId) {
        const isRefund = Number(data.jumlah_bayar ?? 0) < 0;
        const absAmountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(data.jumlah_bayar ?? 0));

        const notifTitle = isRefund ? 'Pengembalian Dana' : 'Progres Pembayaran Masuk';
        const notifBody = isRefund
          ? `Pengembalian dana sebesar ${absAmountStr} untuk unit ${nomorUnit} telah diproses.`
          : `Pembayaran sebesar ${absAmountStr} untuk unit ${nomorUnit} telah dikonfirmasi.`;

        await sendPushNotification(
          [userId],
          notifTitle,
          notifBody,
          { type: 'payment_progress', unitId: assignment.unit?.id ?? '', paymentId: result.id }
        );
      }
    }
  } catch (e) {
    console.error('Failed to send payment notification:', e.message);
  }

  return result;
};

export const modifyAssignmentPayment = async (assignmentId, paymentId, data, userContext) => {
  const result = await repo.updatePayment(assignmentId, paymentId, data, userContext);
  if (!result) throw new AppError('Data pembayaran atau penugasan tidak ditemukan.', 404);
  return result;
};

export const removeAssignmentPayment = async (assignmentId, paymentId, userContext) => {
  const result = await repo.deletePayment(assignmentId, paymentId, userContext);
  if (!result) throw new AppError('Data pembayaran atau penugasan tidak ditemukan.', 404);
  return result;
};

export const removeAssignment = async (id, userContext) => {
  const result = await repo.deleteAssignment(id, userContext);
  if (!result) throw new AppError('Data penugasan tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return result;
};
