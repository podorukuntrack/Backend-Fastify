import * as service from './retention.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `retentions:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getRetentionsList(request.user, request.query);
  }, 300);
  return reply.code(200).send({ success: true, message: 'Retentions retrieved', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `retentions:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getRetentionDetail(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Retention retrieved', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createRetention(request.body, request.user);
    await clearCachePattern('retentions:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Retention recorded', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyRetention(request.params.id, request.body, request.user);
    await clearCachePattern('retentions:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Retention updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeRetention(request.params.id, request.user);
    await clearCachePattern('retentions:*');
    await clearCachePattern('units:*');
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Retention deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

// --- Complaints ---

export const getComplaintsHandler = async (request, reply) => {
  try {
    const data = await service.getComplaints(request.params.id, request.user);
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Complaints retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createComplaintHandler = async (request, reply) => {
  try {
    const data = await service.addComplaint(request.params.id, request.body, request.user);
    await clearCachePattern(`retentions:*`);
    return reply.code(201).send({ success: true, message: 'Complaint recorded', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateComplaintHandler = async (request, reply) => {
  try {
    const data = await service.editComplaint(request.params.id, request.params.complaintId, request.body, request.user);
    await clearCachePattern(`retentions:*`);
    return reply.code(200).send({ success: true, message: 'Complaint updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteComplaintHandler = async (request, reply) => {
  try {
    await service.removeComplaint(request.params.id, request.params.complaintId, request.user);
    await clearCachePattern(`retentions:*`);
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Complaint deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};