// src/modules/handovers/handover.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './handover.schema.js';
import * as controller from './handover.controller.js';

export default async function handoverRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'owner', 'admin', 'direksi', 'customer');
  const writeRoles = authorize('admin');

  // GET - Dapatkan semua handover/serah terima
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua serah terima unit (handover)',
      tags: ['Handovers'],
      querystring: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            description: 'Nomor halaman (default: 1)',
          },
          limit: {
            type: 'string',
            description: 'Jumlah data per halaman (default: 20)',
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan ID unit',
          },
          status: {
            type: 'string',
            description: 'Filter berdasarkan status serah terima',
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles]
  }, controller.getAllHandler);

  // GET - Detail handover by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail serah terima unit beserta defect reports',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID handover/serah terima',
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles]
  }, controller.getByIdHandler);

  // POST - Buat handover/serah terima baru
  

  // PATCH - Customer merespon jadwal
  fastify.patch('/:id/respond', {
    schema: {
      description: 'Customer merespon (ACC/Reschedule) jadwal serah terima',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['dijadwalkan', 'menunggu_konfirmasi_admin'] },
          proposedDate: { type: 'string', format: 'date-time', nullable: true },
          notes: { type: 'string', nullable: true }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.respondHandoverSchema)]
  }, controller.respondHandler);

  // PATCH - Customer konfirmasi selesai
  fastify.patch('/:id/confirm', {
    schema: {
      description: 'Customer mengkonfirmasi bahwa serah terima telah selesai di hari H',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.confirmHandoverSchema)]
  }, controller.confirmHandler);
}