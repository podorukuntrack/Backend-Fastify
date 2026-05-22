import * as service from './project.service.js';
import { getCache, setCache } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getProjects(request.user);
  return reply.code(200).send({ success: true, message: 'Projects retrieved', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getProject(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Project retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createProject(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Project created', data });
  } catch (error) {
    return reply.code(error.statusCode || 400).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyProject(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Project updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeProject(request.params.id, request.user);
    if (!deleted) {
      return reply.code(404).send({ success: false, message: 'Project tidak ditemukan', errors: [] });
    }
    return reply.code(200).send({ success: true, message: 'Project deleted', data: {} });
  } catch (error) {
    const isConstraint = error.code === '23503' || String(error.message).includes('foreign key') || String(error.message).includes('violates') || String(error.message).includes('Failed query');
    if (isConstraint) {
      return reply.code(409).send({ success: false, message: 'Project tidak dapat dihapus karena masih memiliki data (Cluster/Unit). Harap hapus isinya terlebih dahulu.', errors: [] });
    }
    return reply.code(409).send({ success: false, message: error.message || 'Gagal menghapus project', errors: [] });
  }
};

export const getStatsHandler = async (request, reply) => {
  try {
    const projectId = request.params.id;
    const cacheKey = `project:stats:${projectId}`;
    
    // 1. Cek Cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return reply.code(200).send({ success: true, message: 'Project stats retrieved (from cache)', data: cachedData, source: 'cache' });
    }

    // 2. Fetch dari Service
    const data = await service.getProjectStatistics(projectId, request.user);
    
    // 3. Simpan Cache (TTL 5 menit)
    await setCache(cacheKey, data, 300);

    return reply.code(200).send({ success: true, message: 'Project stats retrieved', data, source: 'database' });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};
