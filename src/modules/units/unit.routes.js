import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './unit.schema.js';
import * as controller from './unit.controller.js';

export default async function unitRoutes(fastify, options) {
  // Autentikasi JWT berlaku untuk semua rute
  fastify.addHook('preValidation', fastify.authenticate);
  
  // === READ (Dapat diakses oleh Customer) ===
  const readRoles = authorize('super_admin', 'admin', 'customer');

  // GET - Dapatkan semua units
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua unit dalam cluster',
      tags: ['Units'],
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
          clusterId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Cluster ID',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          status: {
            type: 'string',
            enum: ['available', 'reserved', 'sold'],
            description: 'Filter berdasarkan status unit',
            example: 'available'
          },
          search: {
            type: 'string',
            description: 'Cari unit berdasarkan block/nomor',
            example: 'A-101'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  block: { type: 'string' },
                  number: { type: 'string' },
                  price: { type: 'number' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles]
  }, controller.getAllHandler);
  
  // GET - Detail unit by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail unit berdasarkan ID',
      tags: ['Units'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID unit yang ingin diambil',
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
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                block: { type: 'string' },
                number: { type: 'string' },
                price: { type: 'number' },
                status: { type: 'string' },
                clusterId: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.unitIdParamSchema)]
  }, controller.getByIdHandler);

  // GET - Detail lengkap unit dengan informasi cluster & project
  fastify.get('/:id/detail', {
    schema: {
      description: 'Mendapatkan detail lengkap unit termasuk cluster dan project',
      tags: ['Units'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID unit',
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
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                block: { type: 'string' },
                number: { type: 'string' },
                price: { type: 'number' },
                status: { type: 'string' },
                cluster: { type: 'object' },
                project: { type: 'object' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.unitIdParamSchema)]
  }, controller.getDetailHandler);

  // === WRITE / CRUD (Hanya dapat diakses oleh Admin & Super Admin) ===
  const writeRoles = authorize('super_admin', 'admin');

  // POST - Buat unit baru
  fastify.post('/', {
    schema: {
      description: 'Membuat unit baru dalam cluster',
      tags: ['Units'],
      body: {
        type: 'object',
        required: ['clusterId', 'block', 'number'],
        properties: {
          clusterId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Cluster tempat unit berada',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          block: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Blok unit (contoh: A, B, C)',
            example: 'A'
          },
          number: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Nomor unit (contoh: 101, 102)',
            example: '101'
          },
          price: {
            type: 'number',
            description: 'Harga unit dalam rupiah',
            example: 500000000
          },
          status: {
            type: 'string',
            enum: ['available', 'reserved', 'sold'],
            description: 'Status awal unit (default: available)',
            example: 'available'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'ID User pemilik (optional jika belum terjual)',
            example: '550e8400-e29b-41d4-a716-446655440001'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional untuk admin)',
            example: '550e8400-e29b-41d4-a716-446655440002'
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
    preHandler: [writeRoles, validate(schema.createUnitSchema)]
  }, controller.createHandler);
  
  // PATCH - Update unit
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate data unit',
      tags: ['Units'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID unit yang ingin diupdate',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          block: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Blok unit baru',
            example: 'B'
          },
          number: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Nomor unit baru',
            example: '102'
          },
          price: {
            type: 'number',
            description: 'Harga unit baru',
            example: 600000000
          },
          status: {
            type: 'string',
            enum: ['available', 'reserved', 'sold'],
            description: 'Status unit baru',
            example: 'sold'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'ID User pemilik baru',
            example: '550e8400-e29b-41d4-a716-446655440001'
          },
          clusterId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Cluster baru',
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
    preHandler: [writeRoles, validate(schema.updateUnitSchema)]
  }, controller.updateHandler);
  
  // DELETE - Hapus unit
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus unit dari cluster',
      tags: ['Units'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID unit yang ingin dihapus',
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
    preHandler: [writeRoles, validate(schema.unitIdParamSchema)]
  }, controller.deleteHandler);
}