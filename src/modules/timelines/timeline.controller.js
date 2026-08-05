import * as service from './timeline.service.js';
import { withCache, CACHE_TTL } from '../../shared/utils/cache.js';
import { invalidateFor } from '../../shared/utils/cacheGraph.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `timelines:list:${request.user.sub}:${request.user.companyId || 'all'}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getTimelines(request.user, request.query);
  }, CACHE_TTL);
  return reply.code(200).send({ success: true, message: 'Timelines retrieved', data, source });
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createTimeline(request.body, request.user);
    await invalidateFor('timeline');
    return reply.code(201).send({ success: true, message: 'Timeline created', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyTimeline(request.params.id, request.body, request.user);
    await invalidateFor('timeline');
    return reply.code(200).send({ success: true, message: 'Timeline updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeTimeline(request.params.id, request.user);
    await invalidateFor('timeline');
    return reply.code(200).send({ success: true, message: 'Timeline deleted', data: {} });
  } catch (error) {
    throw error;
  }
};