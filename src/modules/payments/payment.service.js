import * as repo from './payment.repository.js';
import { findUnitById } from '../units/unit.repository.js';

export const getPayments = async (userContext) => {
  return await repo.findAllPayments(userContext);
};

export const getPaymentsByUnit = async (unitId, userContext) => {
  // Pastikan user berhak melihat unit ini sebelum melihat riwayat bayarnya
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return await repo.findPaymentsByUnitId(unitId, userContext);
};

export const createPayment = async (data, userContext) => {
  if (userContext.role === 'admin') data.companyId = userContext.companyId;
  const unit = await findUnitById(data.unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  
  return await repo.insertPayment(data);
};