import * as repo from './cluster.repository.js';
import * as projectRepo from '../projects/project.repository.js';

// =========================
// MAPPER
// =========================
const mapCluster = (row) => {
  const c = row.clusters ?? row;
  const p = row.projects ?? row.project ?? null;

  return {
    id: c.id,
    company_id: c.companyId,
    project_id: c.projectId,
    nama_cluster: c.namaCluster,
    jumlah_unit: c.jumlahUnit,
    project: p
      ? {
          id: p.id,
          nama_proyek: p.namaProyek,
        }
      : null,
    created_at: c.createdAt?.toISOString() ?? null,
    updated_at: c.updatedAt?.toISOString() ?? null,
  };
};

// =========================
// GET ALL
// =========================
export const getClusters = async (userContext) => {
  const rows = await repo.findAllClusters(userContext);
  return rows.map(mapCluster);
};

// =========================
// GET BY ID
// =========================
export const getCluster = async (id, userContext) => {
  const cluster = await repo.findClusterById(id, userContext);

  if (!cluster) {
    throw new Error('Cluster not found or access denied');
  }

  return mapCluster(cluster);
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

  const p = project.projects ?? project;

  const insertData = {
    companyId: p.companyId, // WAJIB karena kolom NOT NULL
    projectId: data.project_id,
    namaCluster: data.nama_cluster,
    jumlahUnit: data.jumlah_unit,
  };

  const result = await repo.insertCluster(insertData);

  return mapCluster(result);
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

    const p = project.projects ?? project;

    updateData.projectId = data.project_id;
    updateData.companyId = p.companyId;
  }

  if (data.nama_cluster !== undefined) {
    updateData.namaCluster = data.nama_cluster;
  }

  if (data.jumlah_unit !== undefined) {
    updateData.jumlahUnit = data.jumlah_unit;
  }

  const cluster = await repo.updateCluster(
    id,
    updateData,
    userContext
  );

  if (!cluster) {
    throw new Error('Cluster not found or access denied');
  }

  return mapCluster(cluster);
};

// =========================
// DELETE
// =========================
export const removeCluster = async (id, userContext) => {
  const cluster = await repo.deleteCluster(id, userContext);

  if (!cluster) {
    throw new Error('Cluster not found or access denied');
  }

  return mapCluster(cluster);
};