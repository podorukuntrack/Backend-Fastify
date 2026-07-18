import * as service from './user.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const { page, limit, search, role, all_customers } = request.query;
  const userId = request.user.sub || request.user.sub;
  const cacheKey = `users:list_v2:${userId}:${JSON.stringify(request.query)}`;
  
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getUsers(page, limit, request.user, { search, role, all_customers });
  }, 300);
  
  return reply.code(200).send({
    success: true,
    message: 'Users retrieved',
    data: data.data,
    meta: data.meta,
    source
  });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `users:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getUser(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createUser(request.body, request.user);
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'User created', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyUser(request.params.id, request.body, request.user);
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'User updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeUser(request.params.id, request.user);
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'User deleted', data: {} });
  } catch (error) {
    throw error;
  }
};
