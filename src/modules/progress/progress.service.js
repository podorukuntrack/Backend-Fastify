import * as repo from './progress.repository.js';
import { findUnitById } from '../units/unit.repository.js';

export const getProgressList = async (userContext, filters = {}) => {
  return await repo.findAllProgress(userContext, filters);
};

export const getProgressByUnit = async (unitId, userContext) => {
  // Verifikasi apakah user berhak melihat unit ini
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return await repo.findProgressByUnitId(unitId, userContext);
};

export const getProgress = async (id, userContext) => {
  const data = await repo.findProgressById(id, userContext);
  if (!data) throw new Error('Progress not found or access denied');
  return data;
};

export const createProgress = async (data, userContext) => {
  const unitId = data.unit_id ?? data.unitId;
  const unit = await findUnitById(unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return await repo.insertProgress({ ...data, unit_id: unitId }, userContext);
};


export const modifyProgress = async (id, data, userContext) => {
  const result = await repo.updateProgress(id, data, userContext);
  if (!result) throw new Error('Progress not found or access denied');
  return result;
};

export const removeProgress = async (id, userContext) => {
  const result = await repo.deleteProgress(id, userContext);
  if (!result) throw new Error('Progress not found or access denied');
  return result;
};
