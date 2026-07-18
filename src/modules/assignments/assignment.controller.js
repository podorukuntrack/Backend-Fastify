import * as service from './assignment.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `assignments:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data: cachedRes, source } = await withCache(cacheKey, async () => {
    const data = await service.getAssignments(request.user, request.query);
    const total = await service.getAssignmentsMeta(request.query, request.user);
    return { data, total };
  }, 300);

  const page = Number(request.query.page ?? 1);
  const limit = Number((request.query.limit ?? cachedRes.data.length) || 20);
  
  return reply.code(200).send({
    success: true,
    message: 'Assignments retrieved',
    data: cachedRes.data,
    meta: { page, limit, total: cachedRes.total, totalPages: Math.max(Math.ceil(cachedRes.total / limit), 1) },
    source
  });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `assignments:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getAssignment(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Assignment retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createAssignment(request.body, request.user);
    await clearCachePattern('assignments:*');
    await clearCachePattern('units:*');
    await clearCachePattern('users:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Assignment created', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyAssignment(request.params.id, request.body, request.user);
    await clearCachePattern('assignments:*');
    await clearCachePattern('units:*');
    await clearCachePattern('users:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Assignment updated', data });
  } catch (error) {
    throw error;
  }
};

export const getPaymentsHandler = async (request, reply) => {
  try {
    const cacheKey = `assignments:payments:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getAssignmentPayments(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Payments retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createPaymentHandler = async (request, reply) => {
  try {
    const data = await service.createAssignmentPayment(request.params.id, request.body, request.user);
    await clearCachePattern('assignments:*');
    await clearCachePattern('payments:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Payment created', data });
  } catch (error) {
    throw error;
  }
};

export const updatePaymentHandler = async (request, reply) => {
  try {
    const data = await service.modifyAssignmentPayment(request.params.id, request.params.paymentId, request.body, request.user);
    await clearCachePattern('assignments:*');
    await clearCachePattern('payments:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Payment updated', data });
  } catch (error) {
    throw error;
  }
};

export const deletePaymentHandler = async (request, reply) => {
  try {
    const data = await service.removeAssignmentPayment(request.params.id, request.params.paymentId, request.user);
    await clearCachePattern('assignments:*');
    await clearCachePattern('payments:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Payment deleted', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeAssignment(request.params.id, request.user);
    await clearCachePattern('assignments:*');
    await clearCachePattern('units:*');
    await clearCachePattern('users:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Assignment deleted', data: deleted });
  } catch (error) {
    throw error;
  }
};
