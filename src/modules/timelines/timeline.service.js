import * as repo from './timeline.repository.js';
import { findProjectById } from '../projects/project.repository.js';
import { AppError } from '../../shared/utils/AppError.js';

export const getTimelines = async (userContext, filters = {}) => {
  return await repo.findTimelines(userContext, filters);
};

export const createTimeline = async (data, userContext) => {
  const project = await findProjectById(data.projectId, userContext);
  if (!project) throw new AppError('Gagal menambah timeline: Proyek tidak ditemukan atau Anda tidak memiliki akses.', 400);
  
  // Inherit companyId from project
  data.companyId = project.companyId;
  
  return await repo.insertTimeline(data);
};

export const modifyTimeline = async (id, data, userContext) => {
  const result = await repo.updateTimeline(id, data, userContext);
  if (!result) throw new AppError('Gagal memperbarui: Data timeline tidak ditemukan atau Anda tidak memiliki akses.', 400);
  return result;
};

export const removeTimeline = async (id, userContext) => {
  const result = await repo.deleteTimeline(id, userContext);
  if (!result) throw new AppError('Gagal menghapus: Data timeline yang Anda pilih tidak ditemukan atau Anda tidak memiliki akses untuk menghapusnya.', 400);
  return result;
};