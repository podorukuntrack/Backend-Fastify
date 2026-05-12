import * as repo from './cluster.repository.js';

export const getClusters = async (userContext) => {
  return await repo.findAllClusters(userContext);
};

export const getCluster = async (id, userContext) => {
  const cluster = await repo.findClusterById(id, userContext);
  if (!cluster) throw new Error('Cluster not found or access denied');
  return cluster;
};

export const createCluster = async (data, userContext) => {
  // Jika role admin, paksa companyId sesuai dengan perusahaannya
  if (userContext.role === 'admin') {
    data.companyId = userContext.companyId;
  }
  return await repo.insertCluster(data);
};

export const modifyCluster = async (id, data, userContext) => {
  const cluster = await repo.updateCluster(id, data, userContext);
  if (!cluster) throw new Error('Cluster not found or access denied');
  return cluster;
};

export const removeCluster = async (id, userContext) => {
  const cluster = await repo.deleteCluster(id, userContext);
  if (!cluster) throw new Error('Cluster not found or access denied');
  return cluster;
};