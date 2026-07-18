import * as service from './progress.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `progress:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getProgressList(request.user, request.query);
  }, 300);
  return reply.code(200).send({ success: true, message: 'Success', data, source });
};

export const getByUnitHandler = async (request, reply) => {
  try {
    const cacheKey = `progress:unit:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getProgressByUnit(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    throw error;
  }
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `progress:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getProgress(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createProgress(request.body, request.user);
    await clearCachePattern('progress:*');
    await clearCachePattern('timelines:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Progress added', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyProgress(request.params.id, request.body, request.user);
    await clearCachePattern('progress:*');
    await clearCachePattern('timelines:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Progress updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeProgress(request.params.id, request.user);
    await clearCachePattern('progress:*');
    await clearCachePattern('timelines:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Progress deleted', data: {} });
  } catch (error) {
    throw error;
  }
};
