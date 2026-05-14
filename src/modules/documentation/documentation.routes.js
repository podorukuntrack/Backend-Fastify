// src/modules/documentation/documentation.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './documentation.schema.js';
import * as controller from './documentation.controller.js';

export default async function documentationRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar dokumentasi',
      tags: ['Documentation'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: authorize('super_admin', 'admin', 'customer')
  }, controller.getAllHandler);

  // GET - Dapatkan dokumentasi unit
  fastify.get('/units/:id/documentation', {
    schema: {
      description: 'Mendapatkan daftar semua dokumen/file unit',
      tags: ['Documentation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID unit untuk melihat dokumentasinya',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Tipe dokumen (contoh: blueprint, sertifikat, foto)',
            example: 'blueprint'
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
                  fileName: { type: 'string' },
                  fileUrl: { type: 'string', format: 'uri' },
                  fileType: { type: 'string' },
                  uploadedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [
      authorize('super_admin', 'admin', 'customer'), 
      validate(schema.unitIdParamSchema)
    ]
  }, controller.getByUnitHandler);

  // POST - Upload dokumen/file
  fastify.post('/', {
    schema: {
      description: 'Upload dokumen/file untuk unit',
      tags: ['Documentation'],
      consumes: ['multipart/form-data'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: authorize('super_admin', 'admin')
  }, controller.uploadHandler);

  fastify.post('/documentation/upload', {
    schema: {
      description: 'Upload dokumen/file untuk unit',
      tags: ['Documentation'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['file', 'unitId'],
        properties: {
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit untuk upload dokumen',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          file: {
            type: 'string',
            format: 'binary',
            description: 'File dokumen (PDF, JPG, PNG, dll)'
          },
          docType: {
            type: 'string',
            description: 'Tipe dokumen (blueprint, sertifikat, foto, dll)',
            example: 'blueprint'
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
                fileName: { type: 'string' },
                fileUrl: { type: 'string', format: 'uri' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: authorize('super_admin', 'admin')
  }, controller.uploadHandler);

  // DELETE - Hapus dokumen
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus dokumen/file',
      tags: ['Documentation'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [
      authorize('super_admin', 'admin'),
      validate(schema.docIdParamSchema)
    ]
  }, controller.deleteHandler);

  fastify.delete('/documentation/:id', {
    schema: {
      description: 'Menghapus dokumen/file',
      tags: ['Documentation'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID dokumen yang ingin dihapus',
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
    preHandler: [
      authorize('super_admin', 'admin'), 
      validate(schema.docIdParamSchema)
    ]
  }, controller.deleteHandler);
}
