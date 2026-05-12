// src/modules/companies/company.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './company.schema.js';
import * as controller from './company.controller.js';

export default async function companyRoutes(fastify, options) {
  // Semua route di sini wajib authenticate & role super_admin
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', authorize('super_admin'));




  
  // GET - Dapatkan semua companies
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua perusahaan',
      tags: ['Companies'],
      querystring: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            description: 'Nomor halaman',
            example: '1'
          },
          limit: {
            type: 'string',
            description: 'Jumlah data per halaman',
            example: '10'
          },
          search: {
            type: 'string',
            description: 'Cari perusahaan berdasarkan nama',
            example: 'PT. Maju Jaya'
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

  // POST - Buat company baru
  fastify.post('/', {
    schema: {
      description: 'Membuat perusahaan baru',
      tags: ['Companies'],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
            description: 'Nama perusahaan',
            example: 'PT. Maju Jaya Indonesia'
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
                name: { type: 'string' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.createCompanySchema)]
  }, controller.createHandler);

  // GET - Dapatkan detail company by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail perusahaan berdasarkan ID',
      tags: ['Companies'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID perusahaan',
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
    preHandler: [validate(schema.companyIdParamSchema)]
  }, controller.getByIdHandler);

  // PATCH - Update company
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate data perusahaan',
      tags: ['Companies'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID perusahaan yang ingin diupdate',
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
            description: 'Nama perusahaan baru',
            example: 'PT. Maju Jaya Indonesia - Updated'
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
    preHandler: [validate(schema.updateCompanySchema)]
  }, controller.updateHandler);

  // DELETE - Hapus company
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus perusahaan dari sistem',
      tags: ['Companies'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID perusahaan yang ingin dihapus',
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
    preHandler: [validate(schema.companyIdParamSchema)]
  }, controller.deleteHandler);
}