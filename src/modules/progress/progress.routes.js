import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './progress.schema.js';
import * as controller from './progress.controller.js';

export default async function progressRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'admin', 'customer');
  const writeRoles = authorize('super_admin', 'admin');

  // GET - Dapatkan semua progress records
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua progress updates unit',
      tags: ['Progress'],
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
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Unit ID',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          minPercentage: {
            type: 'number',
            description: 'Filter progress minimal (0-100)',
            example: '50'
          },
          maxPercentage: {
            type: 'number',
            description: 'Filter progress maksimal (0-100)',
            example: '100'
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
                  unitId: { type: 'string', format: 'uuid' },
                  unit_id: { type: 'string', format: 'uuid' },
                  percentage: { type: 'number' },
                  tahap: { type: 'string' },
                  progress_percentage: { type: 'number' },
                  tanggal_update: { type: 'string' },
                  catatan: { type: 'string' },
                  notes: { type: 'string' }
                  ,unit: { type: ['object', 'null'], additionalProperties: true },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
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
  
  // GET - Detail progress by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail progress record berdasarkan ID',
      tags: ['Progress'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID progress record yang ingin diambil',
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
                unitId: { type: 'string', format: 'uuid' },
                percentage: { type: 'number' },
                notes: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.paramIdSchema)]
  }, controller.getByIdHandler);

  // GET - Dapatkan progress unit spesifik
  fastify.get('/unit/:id', {
    schema: {
      description: 'Mendapatkan semua progress updates untuk unit tertentu',
      tags: ['Progress'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID unit untuk melihat progress-nya',
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
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  percentage: { type: 'number' },
                  notes: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.paramIdSchema)]
  }, controller.getByUnitHandler);

  // POST - Buat progress baru
  fastify.post('/', {
    schema: {
      description: 'Membuat/update progress untuk unit',
      tags: ['Progress'],
      body: {
        type: 'object',
        required: [],
        properties: {
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit yang di-update progressnya',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          unit_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit yang di-update progressnya',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Persentase progress pengerjaan unit (0-100)',
            example: '75'
          },
          progress_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Persentase progress pengerjaan unit (0-100)',
            example: '75'
          },
          tahap: {
            type: 'string'
          },
          tanggal_update: {
            type: 'string',
            format: 'date'
          },
          catatan: {
            type: 'string'
          },
          notes: {
            type: 'string',
            description: 'Catatan atau keterangan progress (opsional)',
            example: 'Pengecatan dinding sudah 75% selesai'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional untuk admin)',
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
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                unitId: { type: 'string', format: 'uuid' },
                percentage: { type: 'number' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [writeRoles, validate(schema.createProgressSchema)]
  }, controller.createHandler);
  
  // PATCH - Update progress
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate progress unit yang sudah ada',
      tags: ['Progress'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID progress record yang ingin diupdate',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Persentase progress baru',
            example: '85'
          },
          notes: {
            type: 'string',
            description: 'Catatan progress baru',
            example: 'Pengecatan sudah 85% selesai, tinggal finishing'
          },
          unit_id: {
            type: 'string',
            format: 'uuid'
          },
          tahap: {
            type: 'string'
          },
          progress_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100
          },
          tanggal_update: {
            type: 'string',
            format: 'date'
          },
          catatan: {
            type: 'string'
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
    preHandler: [writeRoles, validate(schema.updateProgressSchema)]
  }, controller.updateHandler);

  // DELETE - Hapus progress record
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus progress record',
      tags: ['Progress'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID progress record yang ingin dihapus',
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
    preHandler: [writeRoles, validate(schema.paramIdSchema)]
  }, controller.deleteHandler);
}
