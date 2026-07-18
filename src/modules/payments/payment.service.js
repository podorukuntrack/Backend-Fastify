import * as repo from './payment.repository.js';
import { findUnitById } from '../units/unit.repository.js';
import { AppError } from '../../shared/utils/AppError.js';

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
  
  return await repo.insertPayment(data);
};