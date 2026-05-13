import * as repo from './unit.repository.js';

export const getUnits = async (userContext, filters = {}) => {
  return await repo.findAllUnits(userContext, filters);
};

export const getUnit = async (id, userContext) => {
  const unit = await repo.findUnitById(id, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return unit;
};

export const getUnitDetail = async (id, userContext) => {
  const unitDetail = await repo.findUnitDetailById(id, userContext);
  if (!unitDetail) throw new Error('Unit detail not found or access denied');
  return unitDetail;
};

export const createUnit = async (data, userContext) => {
  // companyId tidak ada di tabel units, tapi cluster sudah terikat ke company
  // Validasi: pastikan clusterId milik company admin
  return await repo.insertUnit(data);
};

export const createUnits = async (payload, userContext) => {
  // payload: { units: [...] }
  if (!Array.isArray(payload.units) || payload.units.length === 0) {
    throw new Error('Units array is required and must not be empty');
  }
  
  console.log('Creating units batch:', JSON.stringify(payload.units, null, 2));
  const result = await repo.insertUnits(payload.units);
  console.log('Units created successfully:', result);
  return result;
};

export const modifyUnit = async (id, data, userContext) => {
  const unit = await repo.updateUnit(id, data, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return unit;
};

export const removeUnit = async (id, userContext) => {
  const unit = await repo.deleteUnit(id, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return unit;
};