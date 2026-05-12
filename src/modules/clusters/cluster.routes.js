import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './cluster.schema.js';
import * as controller from './cluster.controller.js';

export default async function clusterRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Hanya super_admin dan admin yang memiliki akses ke modul Clusters
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  // GET - Dapatkan semua clusters
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua clusters dalam project',
      tags: ['Clusters'],
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
          search: {
            type: 'string',
            description: 'Cari cluster berdasarkan nama',
            example: 'Cluster A'
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
                  projectId: { type: 'string', format: 'uuid' },
                  companyId: { type: 'string', format: 'uuid' }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  }, controller.getAllHandler);
  
  // POST - Buat cluster baru
  fastify.post('/', {
    schema: {
      description: 'Membuat cluster baru dalam project',
      tags: ['Clusters'],
      body: {
        type: 'object',
        required: ['projectId', 'name'],
        properties: {
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Project yang memiliki cluster',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
            description: 'Nama cluster',
            example: 'Cluster A - Blok Premium'
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
                name: { type: 'string' },
                projectId: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.createClusterSchema)]
  }, controller.createHandler);
  
  // GET - Detail cluster by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail cluster berdasarkan ID',
      tags: ['Clusters'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID cluster yang ingin diambil',
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
                projectId: { type: 'string', format: 'uuid' },
                companyId: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.clusterIdParamSchema)]
  }, controller.getByIdHandler);
  
  // PATCH - Update cluster
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate data cluster',
      tags: ['Clusters'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID cluster yang ingin diupdate',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
            description: 'Nama cluster baru',
            example: 'Cluster A - Blok Premium Updated'
          },
          projectId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Project baru (opsional)',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan baru',
            example: '550e8400-e29b-41d4-a716-446655440001'
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
    preHandler: [validate(schema.updateClusterSchema)]
  }, controller.updateHandler);
  
  // DELETE - Hapus cluster
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus cluster dari project',
      tags: ['Clusters'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID cluster yang ingin dihapus',
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
    preHandler: [validate(schema.clusterIdParamSchema)]
  }, controller.deleteHandler);
}