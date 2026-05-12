import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './project.schema.js';
import * as controller from './project.controller.js';

export default async function projectRoutes(fastify, options) {
  // Pastikan user memiliki JWT yang valid
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Sesuai Permission Matrix: Hanya super_admin dan admin yang bisa mengakses module ini
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  // GET - Dapatkan semua projects dengan pagination
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua projects dengan pagination dan filter',
      tags: ['Projects'],
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
            example: '20'
          },
          search: {
            type: 'string',
            description: 'Cari project berdasarkan nama',
            example: 'Proyek A'
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
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  }, controller.getAllHandler);
  
  // POST - Buat project baru
  fastify.post('/', {
    schema: {
      description: 'Membuat project baru',
      tags: ['Projects'],
      body: {
        type: 'object',
        required: ['name', 'description', 'companyId'],
        properties: {
          name: {
            type: 'string',
            description: 'Nama project',
            example: 'Proyek Pembangunan Toko'
          },
          description: {
            type: 'string',
            description: 'Deskripsi singkat project',
            example: 'Project untuk pembangunan toko retail di area komersial'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan yang memiliki project',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Tanggal mulai project',
            example: '2024-01-15'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'Tanggal target selesai project',
            example: '2024-12-31'
          },
          budget: {
            type: 'number',
            description: 'Budget project dalam rupiah',
            example: 500000000
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
                name: { type: 'string' },
                description: { type: 'string' },
                companyId: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.createProjectSchema)]
  }, controller.createHandler);
  
  // GET - Dapatkan detail project by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail project berdasarkan ID',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID project yang ingin diambil',
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
                name: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.projectIdParamSchema)]
  }, controller.getByIdHandler);
  
  // PATCH - Update project
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate data project',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID project yang ingin diupdate',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nama project baru',
            example: 'Proyek Pembangunan Toko - Update'
          },
          description: {
            type: 'string',
            description: 'Deskripsi project baru',
            example: 'Project untuk pembangunan toko retail - Updated'
          },
          status: {
            type: 'string',
            enum: ['planning', 'ongoing', 'completed', 'paused'],
            description: 'Status project',
            example: 'ongoing'
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'Tanggal target selesai baru',
            example: '2025-01-31'
          },
          budget: {
            type: 'number',
            description: 'Budget project baru',
            example: 600000000
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
              type: 'object'
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.updateProjectSchema)]
  }, controller.updateHandler);
  
  // DELETE - Hapus project
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus project',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID project yang ingin dihapus',
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
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.projectIdParamSchema)]
  }, controller.deleteHandler);

  // GET - Dapatkan statistik project
  fastify.get('/:id/stats', {
    schema: {
      description: 'Mendapatkan statistik dan analytics project',
      tags: ['Projects'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID project untuk mendapatkan stats',
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
                totalUnits: { type: 'number' },
                completedUnits: { type: 'number' },
                progressPercentage: { type: 'number' },
                budgetUsed: { type: 'number' },
                remainingBudget: { type: 'number' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.projectIdParamSchema)]
  }, controller.getStatsHandler);
}