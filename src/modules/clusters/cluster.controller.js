import * as service from './cluster.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getClusters(request.user, request.query);
  return reply.code(200).send({ success: true, message: 'Clusters retrieved', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getCluster(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Cluster retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createCluster(request.body, request.user);
  return reply.code(201).send({ success: true, message: 'Cluster created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyCluster(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Cluster updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeCluster(request.params.id, request.user);
    if (!deleted) {
      return reply.code(404).send({ success: false, message: 'Cluster tidak ditemukan', errors: [] });
    }
    return reply.code(200).send({ success: true, message: 'Cluster deleted', data: {} });
  } catch (error) {
    const isConstraint = error.code === '23503' || String(error.message).includes('foreign key') || String(error.message).includes('violates') || String(error.message).includes('Failed query');
    if (isConstraint) {
      return reply.code(409).send({ success: false, message: 'Cluster tidak dapat dihapus karena masih memiliki Unit di dalamnya. Harap hapus unit terlebih dahulu.', errors: [] });
    }
    return reply.code(409).send({ success: false, message: error.message || 'Gagal menghapus cluster', errors: [] });
  }
};
