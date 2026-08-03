// src/modules/audit/audit.routes.js
import { authorize } from '../../middleware/authorize.js';
import { findAuditLogs, AuditAction } from '../../shared/utils/audit.js';

export default async function auditRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  /**
   * Jejak audit bersifat pengawasan, jadi terbuka untuk seluruh peran staf —
   * namun tetap ter-scope: super_admin dan owner melihat seluruh perusahaan,
   * admin dan direksi hanya perusahaannya (dibatasi di findAuditLogs).
   * Customer tidak berkepentingan dan tidak diberi akses.
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Jejak audit tindakan admin yang sensitif',
        tags: ['Audit'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
            action: { type: 'string', description: 'Filter aksi, mis. user.role_changed' },
            entity: { type: 'string', description: 'Filter entitas, mis. user / assignment / payment' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'array' },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: authorize('super_admin', 'owner', 'admin', 'direksi'),
    },
    async (request, reply) => {
      const { data, meta } = await findAuditLogs(request.user, request.query);
      return reply.code(200).send({
        success: true,
        message: 'Audit logs retrieved',
        data,
        meta,
      });
    }
  );

  // Daftar aksi yang mungkin — dipakai untuk mengisi dropdown filter di web.
  fastify.get(
    '/actions',
    {
      schema: {
        description: 'Daftar jenis aksi yang tercatat di jejak audit',
        tags: ['Audit'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: authorize('super_admin', 'owner', 'admin', 'direksi'),
    },
    async (_request, reply) =>
      reply.code(200).send({
        success: true,
        message: 'Audit actions retrieved',
        data: Object.values(AuditAction).sort(),
      })
  );
}
