import * as service from './unit.service.js';
import { withCache, clearCachePattern, delCache, CACHE_TTL } from '../../shared/utils/cache.js';
import { recordAudit, AuditAction } from '../../shared/utils/audit.js';
import { invalidateFor } from '../../shared/utils/cacheGraph.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `units:list:${request.user.sub}:${request.user.companyId || 'all'}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getUnits(request.user, request.query);
  }, CACHE_TTL);
  return reply.code(200).send({ success: true, message: 'Units retrieved', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `units:detail:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getUnit(request.params.id, request.user);
    }, CACHE_TTL);
    return reply.code(200).send({ success: true, message: 'Unit retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const getDetailHandler = async (request, reply) => {
  try {
    const unitId = request.params.id;
    const cacheKey = `unit:detail_stats:${request.user.sub}:${request.user.companyId || 'all'}:${unitId}`;
    
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getUnitDetail(unitId, request.user);
    }, CACHE_TTL);

    return reply.code(200).send({ success: true, message: 'Unit detail retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createUnit(request.body, request.user);
  await invalidateFor('unit');
  return reply.code(201).send({ success: true, message: 'Unit created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyUnit(request.params.id, request.body, request.user);
    
    await invalidateFor('unit');

    return reply.code(200).send({ success: true, message: 'Unit updated', data });
  } catch (error) {
    throw error;
  }
};

export const bulkCreateHandler = async (request, reply) => {
  const data = await service.createUnits(request.body, request.user);
  await invalidateFor('unit');
  return reply.code(201).send({ success: true, message: 'Units created', data });
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeUnit(request.params.id, request.user);
    if (!deleted) {
      
    await recordAudit({
      request,
      action: AuditAction.UNIT_DELETED,
      entity: 'unit',
      entityId: request.params.id,
      summary: `Menghapus unit ${request.params.id}`,
      metadata: {},
    });

    return reply.code(404).send({ success: false, message: 'Unit tidak ditemukan', errors: [] });
    }
    
    await invalidateFor('unit');

    return reply.code(200).send({ success: true, message: 'Unit deleted', data: {} });
  } catch (error) {
    throw error;
  }
};