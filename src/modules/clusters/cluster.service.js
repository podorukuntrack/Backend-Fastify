import * as repo from './cluster.repository.js';
import * as projectRepo from '../projects/project.repository.js';

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
    throw new Error('Cluster not found or access denied');
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
    throw new Error('Project not found or access denied');
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
      throw new Error('Project not found or access denied');
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
    throw new Error('Cluster not found or access denied');
  }

  return cluster;
};

// =========================
// DELETE
// =========================
export const removeCluster = async (id, userContext) => {
  const cluster = await repo.deleteCluster(id, userContext);

  if (!cluster) {
    throw new Error('Cluster not found or access denied');
  }

  return cluster;
};
