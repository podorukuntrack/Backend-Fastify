import * as repo from './unit.repository.js';

export const getUnits = async (userContext, filters = {}) => {
  return await repo.findAllUnits(userContext, filters);
};

export const getUnit = async (id, userContext) => {
  const unit = await repo.findUnitById(id, userContext);
  if (!unit) throw new AppError('Data unit tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return unit;
};

export const getUnitDetail = async (id, userContext) => {
  const unitDetail = await repo.findUnitDetailById(id, userContext);
  if (!unitDetail) throw new AppError('Detail unit tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return unitDetail;
};

import * as clusterRepo from '../clusters/cluster.repository.js';
import { AppError } from '../../shared/utils/AppError.js';

export const createUnit = async (data, userContext) => {
  const clusterId = data.cluster_id ?? data.clusterId;
  const cluster = await clusterRepo.findClusterById(clusterId, userContext);
  if (!cluster) throw new AppError('Data cluster tidak ditemukan atau Anda tidak memiliki akses.', 404);
  
  return await repo.insertUnit(data);
};

export const createUnits = async (payload, userContext) => {
  const units = Array.isArray(payload) ? payload : payload.units;

  if (!Array.isArray(units) || units.length === 0) {
    throw new AppError('Units array is required and must not be empty', 400);
  }

  return await repo.insertUnits(units);
};

export const modifyUnit = async (id, data, userContext) => {
  const unit = await repo.updateUnit(id, data, userContext);
  if (!unit) throw new AppError('Data unit tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return unit;
};

export const removeUnit = async (id, userContext) => {
  const unit = await repo.deleteUnit(id, userContext);
  if (!unit) throw new AppError('Data unit tidak ditemukan atau Anda tidak memiliki akses.', 404);
  return unit;
};
