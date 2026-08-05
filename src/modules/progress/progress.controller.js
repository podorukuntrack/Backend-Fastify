import * as service from './progress.service.js';
import { withCache, CACHE_TTL } from '../../shared/utils/cache.js';
import { invalidateFor } from '../../shared/utils/cacheGraph.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `progress:list:${request.user.sub}:${request.user.companyId || 'all'}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getProgressList(request.user, request.query);
  }, CACHE_TTL);
  return reply.code(200).send({ success: true, message: 'Success', data, source });
};

export const getByUnitHandler = async (request, reply) => {
  try {
    const cacheKey = `progress:unit:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getProgressByUnit(request.params.id, request.user);
    }, CACHE_TTL);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    throw error;
  }
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `progress:detail:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getProgress(request.params.id, request.user);
    }, CACHE_TTL);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createProgress(request.body, request.user);
    await invalidateFor('progress');
    return reply.code(201).send({ success: true, message: 'Progress added', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyProgress(request.params.id, request.body, request.user);
    await invalidateFor('progress');
    return reply.code(200).send({ success: true, message: 'Progress updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeProgress(request.params.id, request.user);
    await invalidateFor('progress');
    return reply.code(200).send({ success: true, message: 'Progress deleted', data: {} });
  } catch (error) {
    throw error;
  }
};
