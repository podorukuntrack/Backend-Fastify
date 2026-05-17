import * as repo from './retention.repository.js';
import { findUnitById } from '../units/unit.repository.js'; // Pastikan path ini sesuai

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
  // Always ensure companyId is set
  if (!data.companyId) {
    data.companyId = userContext.companyId ?? unit.companyId ?? unit.company_id;
  }
  return await repo.insertRetention(data);
};

export const modifyRetention = async (id, input, userContext) => {
  const result = await repo.updateRetention(id, normalizeInput(input), userContext);
  if (!result) throw new Error('Retention not found or access denied');
  return result;
};

export const removeRetention = async (id, userContext) => {
  const result = await repo.deleteRetention(id, userContext);
  if (!result) throw new Error('Retention not found or access denied');
  return result;
};