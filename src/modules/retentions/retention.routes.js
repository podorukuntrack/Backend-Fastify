import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './retention.schema.js';
import * as controller from './retention.controller.js';

export default async function retentionRoutes(fastify, options) {
  // Semua request wajib lolos JWT
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Hanya super_admin & admin yang bisa mengelola retensi
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

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
            example: '1'
          },
          limit: {
            type: 'string',
            description: 'Jumlah data per halaman (default: 20)',
            example: '10'
          },
          status: {
            type: 'string',
            enum: ['active', 'released', 'claimed'],
            description: 'Filter berdasarkan status retensi',
            example: 'active'
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Unit ID',
            example: '550e8400-e29b-41d4-a716-446655440000'
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
    }
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
            example: '550e8400-e29b-41d4-a716-446655440000'
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
    preHandler: [validate(schema.retentionIdParamSchema)]
  }, controller.getByIdHandler);
  
  // POST - Buat retensi baru
  fastify.post('/', {
    schema: {
      description: 'Membuat retensi/garansi dana untuk unit',
      tags: ['Retentions'],
      body: {
        type: 'object',
        required: ['unitId', 'amount', 'dueDate'],
        properties: {
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit untuk retensi dana',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          amount: {
            type: 'number',
            description: 'Jumlah retensi dalam rupiah',
            example: 50000000
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal berlaku retensi (ISO-8601)',
            example: '2025-06-01T17:00:00Z'
          },
          status: {
            type: 'string',
            enum: ['active', 'released', 'claimed'],
            description: 'Status awal retensi (default: active)',
            example: 'active'
          },
          notes: {
            type: 'string',
            description: 'Catatan retensi (opsional)',
            example: 'Retensi untuk garansi kualitas pengerjaan'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional)',
            example: '550e8400-e29b-41d4-a716-446655440001'
          }
        }
      },
      response: {
        201: {
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
    preHandler: [validate(schema.createRetentionSchema)]
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
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Jumlah retensi baru',
            example: 60000000
          },
          dueDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal berlaku baru',
            example: '2025-07-01T17:00:00Z'
          },
          status: {
            type: 'string',
            enum: ['active', 'released', 'claimed'],
            description: 'Status retensi baru',
            example: 'released'
          },
          notes: {
            type: 'string',
            description: 'Catatan baru',
            example: 'Retensi dilepaskan setelah inspeksi final'
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
    preHandler: [validate(schema.updateRetentionSchema)]
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
            example: '550e8400-e29b-41d4-a716-446655440000'
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
    preHandler: [validate(schema.retentionIdParamSchema)]
  }, controller.deleteHandler);
}