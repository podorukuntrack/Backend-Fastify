// src/modules/timelines/timeline.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './timeline.schema.js';
import * as controller from './timeline.controller.js';

export default async function timelineRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'admin', 'customer');
  const writeRoles = authorize('super_admin', 'admin');

  // GET - Dapatkan semua timeline/milestone project
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua timeline/milestone dalam project',
      tags: ['Timelines'],
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
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Project ID',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Unit ID',
            example: '550e8400-e29b-41d4-a716-446655440001'
          },
          status: {
            type: 'string',
            enum: ['planned', 'on_progress', 'completed', 'delayed'],
            description: 'Filter berdasarkan status timeline',
            example: 'on_progress'
          },
          search: {
            type: 'string',
            description: 'Cari timeline berdasarkan nama task',
            example: 'Fondasi'
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
                  projectId: { type: 'string', format: 'uuid' },
                  unitId: { type: 'string', format: 'uuid' },
                  taskName: { type: 'string' },
                  status: { type: 'string' },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' }
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

  // POST - Buat timeline baru
  fastify.post('/', {
    schema: {
      description: 'Membuat timeline/milestone baru dalam project',
      tags: ['Timelines'],
      body: {
        type: 'object',
        required: ['projectId', 'unitId', 'taskName', 'startDate', 'endDate'],
        properties: {
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Project yang memiliki timeline',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit yang diassign timeline ini',
            example: '550e8400-e29b-41d4-a716-446655440001'
          },
          taskName: {
            type: 'string',
            minLength: 3,
            description: 'Nama task/milestone',
            example: 'Pekerjaan Fondasi & Struktur'
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal mulai task (format ISO-8601)',
            example: '2024-06-01T08:00:00Z'
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal target selesai (format ISO-8601)',
            example: '2024-09-01T17:00:00Z'
          },
          status: {
            type: 'string',
            enum: ['planned', 'on_progress', 'completed', 'delayed'],
            description: 'Status awal timeline (default: planned)',
            example: 'planned'
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
            data: { type: 'object' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [writeRoles, validate(schema.createTimelineSchema)]
  }, controller.createHandler);

  // PATCH - Update timeline
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate timeline/milestone',
      tags: ['Timelines'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID timeline yang ingin diupdate',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          taskName: {
            type: 'string',
            minLength: 3,
            description: 'Nama task baru',
            example: 'Pekerjaan Fondasi, Struktur & Kolom'
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal mulai baru',
            example: '2024-06-05T08:00:00Z'
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal selesai baru',
            example: '2024-09-15T17:00:00Z'
          },
          status: {
            type: 'string',
            enum: ['planned', 'on_progress', 'completed', 'delayed'],
            description: 'Status timeline baru',
            example: 'on_progress'
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
    preHandler: [writeRoles, validate(schema.updateTimelineSchema)]
  }, controller.updateHandler);

  // DELETE - Hapus timeline
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus timeline/milestone dari project',
      tags: ['Timelines'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID timeline yang ingin dihapus',
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