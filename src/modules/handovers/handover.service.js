import * as repo from './handover.repository.js';
import { findUnitById } from '../units/unit.repository.js';

export const getHandovers = async (userContext) => {
  return await repo.findHandovers(userContext);
};

export const getHandover = async (id, userContext) => {
  const handover = await repo.findHandoverById(id, userContext);
  if (!handover) throw new Error('Handover not found or access denied');
  return handover;
};

export const createHandover = async (data, userContext) => {
  if (userContext.role === 'admin') data.companyId = userContext.companyId;
  const unit = await findUnitById(data.unitId, userContext);
  if (!unit) throw new Error('Unit not found or access denied');
  return await repo.insertHandover(data);
};

export const modifyHandover = async (id, data, userContext) => {
  const result = await repo.updateHandover(id, data, userContext);
  if (!result) throw new Error('Handover not found or access denied');
  return result;
};

export const reportDefect = async (handoverId, data, userContext) => {
  const handover = await repo.findHandoverById(handoverId, userContext);
  if (!handover) throw new Error('Handover not found or access denied');
  
  data.handoverId = handoverId;
  return await repo.insertDefect(data);
};