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
          page: { type: 'string', description: 'Nomor halaman (default: 1)', example: '1' },
          limit: { type: 'string', description: 'Jumlah data per halaman (default: 20)', example: '10' },
          project_id: { type: 'string', format: 'uuid', description: 'Filter berdasarkan Project ID' },
          search: { type: 'string', description: 'Cari cluster berdasarkan nama', example: 'Cluster A' }
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
                  project_id: { type: 'string', format: 'uuid' },
                  nama_cluster: { type: 'string' },
                  jumlah_unit: { type: 'number' }, // Tambahan jumlah unit
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
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
        required: ['project_id', 'nama_cluster'],
        properties: {
          project_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID Project yang memiliki cluster',
          },
          nama_cluster: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
            description: 'Nama cluster',
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
                project_id: { type: 'string', format: 'uuid' },
                nama_cluster: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' }
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
          id: { type: 'string', format: 'uuid' }
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
                project_id: { type: 'string', format: 'uuid' },
                nama_cluster: { type: 'string' },
                jumlah_unit: { type: 'number' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
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
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          nama_cluster: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
          },
          project_id: {
            type: 'string',
            format: 'uuid',
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' } // Opsional: Bisa dijabarkan propertinya jika butuh strict serialization
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
          id: { type: 'string', format: 'uuid' }
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