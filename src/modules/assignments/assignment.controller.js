import * as service from './assignment.service.js';
import { withCache, CACHE_TTL } from '../../shared/utils/cache.js';
import { recordAudit, AuditAction } from '../../shared/utils/audit.js';
import { invalidateFor } from '../../shared/utils/cacheGraph.js';

export const getAllHandler = async (request, reply) => {
  const cacheKey = `assignments:list:${request.user.sub}:${request.user.companyId || 'all'}:${JSON.stringify(request.query)}`;
  const { data: cachedRes, source } = await withCache(cacheKey, async () => {
    const data = await service.getAssignments(request.user, request.query);
    const total = await service.getAssignmentsMeta(request.query, request.user);
    return { data, total };
  }, CACHE_TTL);

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
    const cacheKey = `assignments:detail:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getAssignment(request.params.id, request.user);
    }, CACHE_TTL);
    return reply.code(200).send({ success: true, message: 'Assignment retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createAssignment(request.body, request.user);
    await invalidateFor('assignment');
    
    await recordAudit({
      request,
      action: AuditAction.ASSIGNMENT_CREATED,
      entity: 'assignment',
      entityId: data?.id,
      summary: `Membuat penugasan unit ${data?.unit?.nomor_unit ?? '?'} untuk ${data?.user?.nama ?? '?'}`,
      metadata: {
        unit: data?.unit?.nomor_unit,
        pembeli: data?.user?.nama,
        tipe_pembayaran: data?.pembayaran?.tipe,
        harga_total: data?.pembayaran?.harga_total,
      },
    });

    return reply.code(201).send({ success: true, message: 'Assignment created', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyAssignment(request.params.id, request.body, request.user);
    await invalidateFor('assignment');
    
    await recordAudit({
      request,
      action: AuditAction.ASSIGNMENT_UPDATED,
      entity: 'assignment',
      entityId: request.params.id,
      summary: `Memperbarui penugasan unit ${data?.unit?.nomor_unit ?? request.params.id}`,
      metadata: { kolom: Object.keys(request.body ?? {}) },
    });

    return reply.code(200).send({ success: true, message: 'Assignment updated', data });
  } catch (error) {
    throw error;
  }
};

export const getPaymentsHandler = async (request, reply) => {
  try {
    const cacheKey = `assignments:payments:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
    const { data, source } = await withCache(cacheKey, async () => {
      return await service.getAssignmentPayments(request.params.id, request.user);
    }, CACHE_TTL);
    return reply.code(200).send({ success: true, message: 'Payments retrieved', data, source });
  } catch (error) {
    throw error;
  }
};

export const createPaymentHandler = async (request, reply) => {
  try {
    const data = await service.createAssignmentPayment(request.params.id, request.body, request.user);
    await invalidateFor('payment');
    
    await recordAudit({
      request,
      action: AuditAction.PAYMENT_CREATED,
      entity: 'payment',
      entityId: data?.id,
      summary: `Mencatat pembayaran ${data?.jumlah_bayar ?? '?'} pada penugasan ${request.params.id}`,
      metadata: { assignment_id: request.params.id, jumlah_bayar: data?.jumlah_bayar, catatan: data?.catatan },
    });

    return reply.code(201).send({ success: true, message: 'Payment created', data });
  } catch (error) {
    throw error;
  }
};

export const updatePaymentHandler = async (request, reply) => {
  try {
    const data = await service.modifyAssignmentPayment(request.params.id, request.params.paymentId, request.body, request.user);
    await invalidateFor('payment');
    
    await recordAudit({
      request,
      action: AuditAction.PAYMENT_UPDATED,
      entity: 'payment',
      entityId: request.params.paymentId,
      summary: `Mengubah pembayaran ${request.params.paymentId} menjadi ${data?.jumlah_bayar ?? '?'}`,
      metadata: { assignment_id: request.params.id, jumlah_bayar_baru: data?.jumlah_bayar },
    });

    return reply.code(200).send({ success: true, message: 'Payment updated', data });
  } catch (error) {
    throw error;
  }
};

export const deletePaymentHandler = async (request, reply) => {
  try {
    const data = await service.removeAssignmentPayment(request.params.id, request.params.paymentId, request.user);
    await invalidateFor('payment');
    
    await recordAudit({
      request,
      action: AuditAction.PAYMENT_DELETED,
      entity: 'payment',
      entityId: request.params.paymentId,
      summary: `Menghapus pembayaran ${request.params.paymentId} dari penugasan ${request.params.id}`,
      metadata: { assignment_id: request.params.id },
    });

    return reply.code(200).send({ success: true, message: 'Payment deleted', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    const deleted = await service.removeAssignment(request.params.id, request.user);
    await invalidateFor('assignment');
    
    await recordAudit({
      request,
      action: AuditAction.ASSIGNMENT_DELETED,
      entity: 'assignment',
      entityId: request.params.id,
      summary: `Menghapus penugasan ${request.params.id}`,
      metadata: {},
    });

    return reply.code(200).send({ success: true, message: 'Assignment deleted', data: deleted });
  } catch (error) {
    throw error;
  }
};
