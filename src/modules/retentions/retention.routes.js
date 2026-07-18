import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './retention.schema.js';
import * as controller from './retention.controller.js';

export default async function retentionRoutes(fastify, options) {
  // Semua request wajib lolos JWT
  fastify.addHook('preValidation', fastify.authenticate);
  
  const readRoles = authorize('super_admin', 'owner', 'admin', 'direksi', 'customer');
  const writeRoles = authorize('admin');

  // GET - Dapatkan semua retensi
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua retensi/garansi dana unit',
      tags: ['Retentions'],
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
          status: {
            type: 'string',
            enum: ['active', 'released', 'claimed'],
            description: 'Filter berdasarkan status retensi',
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Unit ID',
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
  
  // GET - Detail retensi by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail retensi berdasarkan ID',
      tags: ['Retentions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID retensi yang ingin diambil',
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
    preHandler: [readRoles, validate(schema.retentionIdParamSchema)]
  }, controller.getByIdHandler);
  
  // POST - Buat retensi baru
  fastify.post('/', {
    schema: {
      description: 'Membuat retensi/garansi untuk unit',
      tags: ['Retentions'],
      body: {
        type: 'object',
        required: ['unitId', 'dueDate'],
        properties: {
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit untuk retensi',
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal berlaku retensi (ISO-8601)',
          },
          status: {
            type: 'string',
            enum: ['active', 'released', 'claimed'],
            description: 'Status awal retensi (default: active)',
          },
          notes: {
            type: 'string',
            description: 'Catatan retensi (opsional)',
          },
          linkFoto360: {
            type: ['string', 'null'],
            description: 'Link foto 360 unit'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional)',
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object', additionalProperties: true }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [writeRoles, validate(schema.createRetentionSchema)]
  }, controller.createHandler);
  
  // PATCH - Update retensi
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate data retensi',
      tags: ['Retentions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID retensi yang ingin diupdate',
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          dueDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal berlaku baru',
          },
          status: {
            type: 'string',
            enum: ['active', 'released', 'claimed'],
            description: 'Status retensi baru',
          },
          notes: {
            type: 'string',
            description: 'Catatan baru',
          },
          linkFoto360: {
            type: ['string', 'null'],
            description: 'Link foto 360 unit'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object', additionalProperties: true }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [writeRoles, validate(schema.updateRetentionSchema)]
  }, controller.updateHandler);
  
  // DELETE - Hapus retensi
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus retensi',
      tags: ['Retentions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID retensi yang ingin dihapus',
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [writeRoles, validate(schema.retentionIdParamSchema)]
  }, controller.deleteHandler);

  // --- Complaints ---

  // GET - Daftar keluhan retensi
  fastify.get('/:id/complaints', {
    schema: {
      tags: ['Retentions'],
      params: schema.retentionIdParamSchema.params,
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
    preHandler: [readRoles, validate(schema.retentionIdParamSchema)]
  }, controller.getComplaintsHandler);

  // POST - Tambah keluhan retensi
  fastify.post('/:id/complaints', {
    schema: {
      tags: ['Retentions'],
      params: schema.retentionIdParamSchema.params,
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.createComplaintSchema)]
  }, controller.createComplaintHandler);

  // PATCH - Update keluhan retensi
  fastify.patch('/:id/complaints/:complaintId', {
    schema: {
      tags: ['Retentions'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.updateComplaintSchema)]
  }, controller.updateComplaintHandler);

  // DELETE - Hapus keluhan retensi
  fastify.delete('/:id/complaints/:complaintId', {
    schema: {
      tags: ['Retentions'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [writeRoles, validate(schema.complaintIdParamSchema)]
  }, controller.deleteComplaintHandler);
}