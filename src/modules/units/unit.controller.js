import * as service from './unit.service.js';
import { withCache, clearCachePattern, delCache } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `units:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getUnits(request.user, request.query);
  }, 3600);
  return reply.code(200).send({ success: true, message: 'Units retrieved', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `units:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getUnit(request.params.id, request.user);
    }, 3600);
    return reply.code(200).send({ success: true, message: 'Unit retrieved', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const getDetailHandler = async (request, reply) => {
  try {
    const unitId = request.params.id;
    const cacheKey = `unit:detail_stats:${request.user.sub}:${unitId}`;
    
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getUnitDetail(unitId, request.user);
    }, 600);

    return reply.code(200).send({ success: true, message: 'Unit detail retrieved', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createUnit(request.body, request.user);
  await clearCachePattern('units:*');
  await clearCachePattern('clusters:*');
  await clearCachePattern('projects:*');
  return reply.code(201).send({ success: true, message: 'Unit created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyUnit(request.params.id, request.body, request.user);
    
    await clearCachePattern('units:*');
    await delCache(`unit:detail_stats:${request.user.sub}:${request.params.id}`);
    await clearCachePattern('clusters:*');
    await clearCachePattern('projects:*');

    return reply.code(200).send({ success: true, message: 'Unit updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const bulkCreateHandler = async (request, reply) => {
  const data = await service.createUnits(request.body, request.user);
  await clearCachePattern('units:*');
  await clearCachePattern('clusters:*');
  await clearCachePattern('projects:*');
  return reply.code(201).send({ success: true, message: 'Units created', data });
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeUnit(request.params.id, request.user);
    if (!deleted) {
      return reply.code(404).send({ success: false, message: 'Unit tidak ditemukan', errors: [] });
    }
    
    await clearCachePattern('units:*');
    await delCache(`unit:detail_stats:${request.user.sub}:${request.params.id}`);
    await clearCachePattern('clusters:*');
    await clearCachePattern('projects:*');

    return reply.code(200).send({ success: true, message: 'Unit deleted', data: {} });
  } catch (error) {
    const isConstraint = error.code === '23503' || String(error.message).includes('foreign key') || String(error.message).includes('violates') || String(error.message).includes('Failed query');
    if (isConstraint) {
      return reply.code(409).send({ success: false, message: 'Unit tidak dapat dihapus karena sudah memiliki data terkait (seperti progres pembangunan atau data serah terima).', errors: [] });
    }
    return reply.code(409).send({ success: false, message: error.message || 'Gagal menghapus unit', errors: [] });
  }
};