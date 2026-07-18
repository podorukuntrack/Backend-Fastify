import * as service from './cluster.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `clusters:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data: result, source } = await withCache(cacheKey, async () => {
    return await service.getClusters(request.user, request.query);
  }, 300);
  
  return reply.code(200).send({ success: true, message: 'Clusters retrieved', data: result.data, meta: { total: result.total }, source });
};

export const getByProjectIdHandler = async (request, reply) => {
  // Alias the route param to the query param expected by the service
  request.query.project_id = request.params.projectId;
  const cacheKey = `clusters:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data: result, source } = await withCache(cacheKey, async () => {
    return await service.getClusters(request.user, request.query);
  }, 300);
  
  return reply.code(200).send({ success: true, message: 'Clusters retrieved', data: result.data, meta: { total: result.total }, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `clusters:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getCluster(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Cluster retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createCluster(request.body, request.user);
  await clearCachePattern('clusters:*');
  await clearCachePattern('dashboard:*');
  return reply.code(201).send({ success: true, message: 'Cluster created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyCluster(request.params.id, request.body, request.user);
    await clearCachePattern('clusters:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Cluster updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeCluster(request.params.id, request.user);
    if (!deleted) {
      return reply.code(404).send({ success: false, message: 'Cluster tidak ditemukan', errors: [] });
    }
    await clearCachePattern('clusters:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Cluster deleted', data: {} });
  } catch (error) {
    throw error;
  }
};
