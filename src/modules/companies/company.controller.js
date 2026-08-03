// src/modules/companies/company.controller.js
import * as service from './company.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';
import { recordAudit, AuditAction } from '../../shared/utils/audit.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `companies:list:${request.user.sub}:${request.user.companyId || 'all'}`;
  const { data, source } = await withCache(cacheKey, async () => {
    return await service.getCompanies(request.user);
  }, 300);
  return reply.code(200).send({ success: true, message: 'Success', data, source });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const cacheKey = `companies:detail:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getCompany(request.params.id, request.user);
    }, 300);
    return reply.code(200).send({ success: true, message: 'Success', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createCompany(request.body);
  await clearCachePattern('companies:*');
  await clearCachePattern('dashboard:*');
  
    await recordAudit({
      request,
      action: AuditAction.COMPANY_CREATED,
      entity: 'company',
      entityId: data?.id,
      summary: `Membuat perusahaan ${data?.nama_pt ?? '?'}`,
      metadata: { nama_pt: data?.nama_pt, kode_pt: data?.kode_pt },
    });

    return reply.code(201).send({ success: true, message: 'Company created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyCompany(request.params.id, request.body);
    await clearCachePattern('companies:*');
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');
    
    await recordAudit({
      request,
      action: AuditAction.COMPANY_UPDATED,
      entity: 'company',
      entityId: request.params.id,
      summary: `Memperbarui perusahaan ${data?.nama_pt ?? request.params.id}`,
      metadata: { kolom: Object.keys(request.body ?? {}) },
    });

    return reply.code(200).send({ success: true, message: 'Company updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeCompany(request.params.id);
    await clearCachePattern('companies:*');
    await clearCachePattern('dashboard:*');
    
    await recordAudit({
      request,
      action: AuditAction.COMPANY_DELETED,
      entity: 'company',
      entityId: request.params.id,
      summary: `Menghapus perusahaan ${request.params.id}`,
      metadata: {},
    });

    return reply.code(200).send({ success: true, message: 'Company deleted', data: {} });
  } catch (error) {
    throw error;
  }
};