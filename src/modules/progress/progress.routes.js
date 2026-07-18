import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './progress.schema.js';
import * as controller from './progress.controller.js';

export default async function progressRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'owner', 'admin', 'direksi', 'customer');
  const writeRoles = authorize('admin');

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
          },
          limit: {
            type: 'string',
            description: 'Jumlah data per halaman (default: 20)',
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Unit ID',
          },
          minPercentage: {
            type: 'number',
            description: 'Filter progress minimal (0-100)',
          },
          maxPercentage: {
            type: 'number',
            description: 'Filter progress maksimal (0-100)',
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
          },
          unit_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit yang di-update progressnya',
          },
          percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Persentase progress pengerjaan unit (0-100)',
          },
          progress_percentage: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Persentase progress pengerjaan unit (0-100)',
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
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional untuk admin)',
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
          },
          notes: {
            type: 'string',
            description: 'Catatan progress baru',
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
            data: { type: 'object', additionalProperties: true }
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
