import * as service from './user.service.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';
import { recordAudit, AuditAction } from '../../shared/utils/audit.js';

export const getAllHandler = async (request, reply) => {
  const { page, limit, search, role, all_customers } = request.query;
  const userId = request.user.sub || request.user.sub;
  const cacheKey = `users:list_v2:${userId}:${request.user.companyId || 'all'}:${JSON.stringify(request.query)}`;
  
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
    const cacheKey = `users:detail:${request.user.sub}:${request.user.companyId || 'all'}:${request.params.id}`;
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

    await recordAudit({
      request,
      action: AuditAction.USER_CREATED,
      entity: 'user',
      entityId: data?.id,
      summary: `Membuat akun ${data?.email} dengan role ${data?.role}`,
      metadata: { email: data?.email, role: data?.role, company_id: data?.company_id },
    });

    return reply.code(201).send({ success: true, message: 'User created', data });
  } catch (error) {
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    // Diambil sebelum perubahan agar nilai lama bisa ikut tercatat.
    const before = await service.getUser(request.params.id, request.user).catch(() => null);

    const data = await service.modifyUser(request.params.id, request.body, request.user);
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');

    // Perubahan role dan status dicatat terpisah karena keduanya yang paling
    // berdampak: satu mengubah kewenangan, satu memutus akses.
    const roleChanged = request.body?.role && before && request.body.role !== before.role;
    const statusChanged = request.body?.status && before && request.body.status !== before.status;

    if (roleChanged) {
      await recordAudit({
        request,
        action: AuditAction.USER_ROLE_CHANGED,
        entity: 'user',
        entityId: request.params.id,
        summary: `Mengubah role ${before.email} dari ${before.role} menjadi ${request.body.role}`,
        metadata: { email: before.email, dari: before.role, menjadi: request.body.role },
      });
    }

    if (statusChanged) {
      await recordAudit({
        request,
        action: AuditAction.USER_STATUS_CHANGED,
        entity: 'user',
        entityId: request.params.id,
        summary: `Mengubah status ${before.email} dari ${before.status} menjadi ${request.body.status}`,
        metadata: { email: before.email, dari: before.status, menjadi: request.body.status },
      });
    }

    if (!roleChanged && !statusChanged) {
      await recordAudit({
        request,
        action: AuditAction.USER_UPDATED,
        entity: 'user',
        entityId: request.params.id,
        summary: `Memperbarui data akun ${before?.email ?? request.params.id}`,
        metadata: { kolom: Object.keys(request.body ?? {}).filter((k) => k !== 'password') },
      });
    }

    return reply.code(200).send({ success: true, message: 'User updated', data });
  } catch (error) {
    throw error;
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    const before = await service.getUser(request.params.id, request.user).catch(() => null);

    await service.removeUser(request.params.id, request.user);
    await clearCachePattern('users:*');
    await clearCachePattern('dashboard:*');

    await recordAudit({
      request,
      action: AuditAction.USER_DELETED,
      entity: 'user',
      entityId: request.params.id,
      summary: `Menghapus akun ${before?.email ?? request.params.id} (role ${before?.role ?? '?'})`,
      metadata: { email: before?.email, role: before?.role, nama: before?.nama },
    });

    return reply.code(200).send({ success: true, message: 'User deleted', data: {} });
  } catch (error) {
    throw error;
  }
};
