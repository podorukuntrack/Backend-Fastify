import * as repo from './retention.repository.js';
import { findUnitById } from '../units/unit.repository.js'; // Pastikan path ini sesuai

export const getRetentionsList = async (userContext) => {
  return await repo.findRetentions(userContext);
};

export const getRetentionDetail = async (id, userContext) => {
  const retention = await repo.findRetentionById(id, userContext);
  if (!retention) throw new Error('Retention not found or access denied');
  return retention;
};

export const createRetention = async (data, userContext) => {
  // Paksa companyId menjadi milik admin jika rolenya admin
  if (userContext.role === 'admin') data.companyId = userContext.companyId;

  // Verifikasi apakah unit benar-benar ada dan milik company tersebut
  const unit = await findUnitById(data.unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');

  return await repo.insertRetention(data);
};

export const modifyRetention = async (id, data, userContext) => {
  const result = await repo.updateRetention(id, data, userContext);
  if (!result) throw new Error('Retention not found or access denied');
  return result;
};

export const removeRetention = async (id, userContext) => {
  const result = await repo.deleteRetention(id, userContext);
  if (!result) throw new Error('Retention not found or access denied');
  return result;
};