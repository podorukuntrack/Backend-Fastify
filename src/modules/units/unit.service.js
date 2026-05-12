import * as repo from './unit.repository.js';

export const getUnits = async (userContext) => {
  return await repo.findAllUnits(userContext);
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
  if (userContext.role === 'admin') {
    data.companyId = userContext.companyId;
  }
  return await repo.insertUnit(data);
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