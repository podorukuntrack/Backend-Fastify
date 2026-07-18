import * as service from './payment.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `payments:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getPayments(request.user);
  }, 300);
  return reply.code(200).send({ success: true, message: 'Success', data, source });
};

export const getByUnitHandler = async (request, reply) => {
  try {
    const cacheKey = `payments:unit:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getPaymentsByUnit(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createPayment(request.body, request.user);
    await clearCachePattern('payments:*');
    await clearCachePattern('assignments:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Payment recorded', data });
  } catch (error) {
    throw error;
  }
};