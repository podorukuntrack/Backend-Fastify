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
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createUser(request.body, request.user);
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'User created', data });
  } catch (error) {
    if (error.code === '23505' || error.message.includes('terdaftar')) {
      return reply.code(409).send({ success: false, message: 'Email sudah terdaftar. Silakan gunakan email lain.', errors: [] });
    }
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
    const statusCode = error.message.includes('terdaftar') ? 400 : 404;
    return reply.code(statusCode).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeUser(request.params.id, request.user);
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'User deleted', data: {} });
  } catch (error) {
    console.error('Delete User Error:', error);
    const statusCode = error.message.includes('Tidak dapat menghapus') ? 400 : 404;
    return reply.code(statusCode).send({ success: false, message: error.message, errors: [] });
  }
};
