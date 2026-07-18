// src/modules/timelines/timeline.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './timeline.schema.js';
import * as controller from './timeline.controller.js';

export default async function timelineRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'owner', 'admin', 'direksi', 'customer');
  const writeRoles = authorize('admin');

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
          },
          limit: {
            type: 'string',
            description: 'Jumlah data per halaman (default: 20)',
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Project ID',
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan Unit ID',
          },
          status: {
            type: 'string',
            enum: ['planned', 'on_progress', 'completed', 'delayed'],
            description: 'Filter berdasarkan status timeline',
          },
          search: {
            type: 'string',
            description: 'Cari timeline berdasarkan nama task',
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
          },
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit yang diassign timeline ini',
          },
          taskName: {
            type: 'string',
            minLength: 3,
            description: 'Nama task/milestone',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal mulai task (format ISO-8601)',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal target selesai (format ISO-8601)',
          },
          status: {
            type: 'string',
            enum: ['planned', 'on_progress', 'completed', 'delayed'],
            description: 'Status awal timeline (default: planned)',
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
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal mulai baru',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal selesai baru',
          },
          status: {
            type: 'string',
            enum: ['planned', 'on_progress', 'completed', 'delayed'],
            description: 'Status timeline baru',
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