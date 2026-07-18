import * as service from './project.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `projects:list:${request.user.sub}:${JSON.stringify(request.query)}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getProjects(request.user);
  }, 300);
  return reply.code(200).send({ success: true, message: 'Projects retrieved', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `projects:detail:${request.user.sub}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getProject(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Project retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createProject(request.body, request.user);
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(201).send({ success: true, message: 'Project created', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyProject(request.params.id, request.body, request.user);
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Project updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeProject(request.params.id, request.user);
    if (!deleted) {
      return reply.code(404).send({ success: false, message: 'Project tidak ditemukan', errors: [] });
    }
    await clearCachePattern('projects:*');
    await clearCachePattern('dashboard:*');
    return reply.code(200).send({ success: true, message: 'Project deleted', data: {} });
  } catch (error) {
    throw error;
  }
};

export const getStatsHandler = async (request, reply) => {
  try {
    const projectId = request.params.id;
    const cacheKey = `projects:stats:${request.user.sub}:${projectId}`;
    
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getProjectStatistics(projectId, request.user);
    }, 300);

    return reply.code(200).send({ success: true, message: 'Project stats retrieved', data, source });
  } catch (error) {
    throw error;
  }
};
