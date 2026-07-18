import * as repo from './cluster.repository.js';
import * as projectRepo from '../projects/project.repository.js';
import { AppError } from '../../shared/utils/AppError.js';

// =========================
// GET ALL
// =========================
export const getClusters = async (userContext, filters = {}) => {
  return await repo.findAllClusters(userContext, filters);
};

// =========================
// GET BY ID
// =========================
export const getCluster = async (id, userContext) => {
  const cluster = await repo.findClusterById(id, userContext);

  if (!cluster) {
    throw new AppError('Data cluster tidak ditemukan atau Anda tidak memiliki akses.', 404);
  }

  return cluster;
};

// =========================
// CREATE
// =========================
export const createCluster = async (data, userContext) => {
  // Cari project untuk mendapatkan companyId
  const project = await projectRepo.findProjectById(
    data.project_id,
    userContext
  );

  if (!project) {
    throw new AppError('Data project tidak ditemukan atau Anda tidak memiliki akses.', 404);
  }

  const insertData = {
    project_id: data.project_id,
    nama_cluster: data.nama_cluster,
    jumlah_unit: data.jumlah_unit,
  };

  const result = await repo.insertCluster(insertData);

  return result;
};

// =========================
// UPDATE
// =========================
export const modifyCluster = async (id, data, userContext) => {
  const updateData = {};

  if (data.project_id) {
    // Jika project diganti, update juga companyId
    const project = await projectRepo.findProjectById(
      data.project_id,
      userContext
    );

    if (!project) {
      throw new AppError('Data project tidak ditemukan atau Anda tidak memiliki akses.', 404);
    }

    updateData.project_id = data.project_id;
  }

  if (data.nama_cluster !== undefined) {
    updateData.nama_cluster = data.nama_cluster;
  }

  if (data.jumlah_unit !== undefined) {
    updateData.jumlah_unit = data.jumlah_unit;
  }

  const cluster = await repo.updateCluster(
    id,
    updateData,
    userContext
  );

  if (!cluster) {
    throw new AppError('Data cluster tidak ditemukan atau Anda tidak memiliki akses.', 404);
  }

  return cluster;
};

// =========================
// DELETE
// =========================
export const removeCluster = async (id, userContext) => {
  const cluster = await repo.deleteCluster(id, userContext);

  if (!cluster) {
    throw new AppError('Data cluster tidak ditemukan atau Anda tidak memiliki akses.', 404);
  }

  return cluster;
};
