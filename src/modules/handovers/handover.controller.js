import * as service from './handover.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `handovers:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getHandovers(request.user, request.query);
  }, 300);
  return reply.code(200).send({ success: true, message: 'Handovers retrieved', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `handovers:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getHandover(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Handover retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createHandover(request.body, request.user);
    await clearCachePattern('handovers:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Handover scheduled', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyHandover(request.params.id, request.body, request.user);
    await clearCachePattern('handovers:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Handover updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeHandover(request.params.id, request.user);
    await clearCachePattern('handovers:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Handover deleted', data: {} });
  } catch (error) {
    throw error;
  }
};

export const createDefectHandler = async (request, reply) => {
  try {
    const data = await service.reportDefect(request.params.id, request.body, request.user);
    await clearCachePattern('handovers:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Defect reported', data });
  } catch (error) {
    throw error;
  }
};

export const respondHandler = async (request, reply) => {
  try {
    const data = await service.modifyHandover(request.params.id, request.body, request.user);
    await clearCachePattern('handovers:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Handover response saved', data });
  } catch (error) {
    throw error;
  }
};

export const confirmHandler = async (request, reply) => {
  try {
    const data = await service.modifyHandover(request.params.id, { status: 'selesai' }, request.user);
    await clearCachePattern('handovers:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('unit:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Handover confirmed completed', data });
  } catch (error) {
    throw error;
  }
};