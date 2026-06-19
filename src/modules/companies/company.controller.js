// src/modules/companies/company.controller.js
import * as service from './company.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `companies:list`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getCompanies();
  }, 3600);
  return reply.code(200).send({ success: true, message: 'Success', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `companies:detail:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getCompany(request.params.id);
    }, 3600);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createCompany(request.body);
  await clearCachePattern('companies:*');
  return reply.code(201).send({ success: true, message: 'Company created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyCompany(request.params.id, request.body);
    await clearCachePattern('companies:*');
    return reply.code(200).send({ success: true, message: 'Company updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeCompany(request.params.id);
    await clearCachePattern('companies:*');
    return reply.code(200).send({ success: true, message: 'Company deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};