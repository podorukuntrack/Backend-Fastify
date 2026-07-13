import * as repo from './timeline.repository.js';
import { findProjectById } from '../projects/project.repository.js';

export const getTimelines = async (userContext, filters = {}) => {
  return await repo.findTimelines(userContext, filters);
};

export const createTimeline = async (data, userContext) => {
  const project = await findProjectById(data.projectId, userContext);
  if (!project) throw new Error('Gagal menambah timeline: Proyek tidak ditemukan atau Anda tidak memiliki akses.');
  
  // Inherit companyId from project
  data.companyId = project.companyId;
  
  return await repo.insertTimeline(data);
};

export const modifyTimeline = async (id, data, userContext) => {
  const result = await repo.updateTimeline(id, data, userContext);
  if (!result) throw new Error('Gagal memperbarui: Data timeline tidak ditemukan atau Anda tidak memiliki akses.');
  return result;
};

export const removeTimeline = async (id, userContext) => {
  const result = await repo.deleteTimeline(id, userContext);
  if (!result) throw new Error('Gagal menghapus: Data timeline yang Anda pilih tidak ditemukan atau Anda tidak memiliki akses untuk menghapusnya.');
  return result;
};