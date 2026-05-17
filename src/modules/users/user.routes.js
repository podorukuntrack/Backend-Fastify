// src/modules/users/user.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './user.schema.js';
import * as controller from './user.controller.js';

export default async function userRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Sesuai Permission Matrix: Hanya super_admin dan admin yang bisa CRUD users
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  // GET - Dapatkan semua users dengan pagination
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua users dengan pagination',
      tags: ['Users'],
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
          search: {
            type: 'string',
            description: 'Cari user berdasarkan nama atau email',
            example: 'john@example.com'
          },
          role: {
            type: 'string',
            enum: ['super_admin', 'admin', 'manager', 'supervisor', 'staff', 'customer'],
            description: 'Filter berdasarkan role',
            example: 'admin'
          },
          all_customers: {
            type: 'string',
            description: 'Ambil semua customer tanpa filter company (admin only)',
            example: 'true'
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
                  nama: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string' },
                  companyId: { type: 'string', format: 'uuid' },
                  company_id: { type: ['string', 'null'], format: 'uuid' },
                  nomor_telepon: { type: ['string', 'null'] },
                  status: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.queryUserSchema)]
  }, controller.getAllHandler);

  // POST - Buat user baru
  fastify.post('/', {
    schema: {
      description: 'Membuat user baru dengan email dan password',
      tags: ['Users'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
            description: 'Nama lengkap user',
            example: 'John Doe'
          },
          nama: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
            description: 'Nama lengkap user',
            example: 'John Doe'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email user (harus unik)',
            example: 'john@example.com'
          },
          password: {
            type: 'string',
            minLength: 6,
            description: 'Password (minimal 6 karakter)',
            example: 'password123'
          },
          role: {
            type: 'string',
            enum: ['super_admin', 'admin', 'manager', 'supervisor', 'staff', 'customer'],
            description: 'Role user (default: customer)',
            example: 'manager'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional untuk super_admin)',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          company_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional untuk super_admin)',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          nomor_telepon: {
            type: 'string'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive']
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
                nama: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' }
                ,company_id: { type: ['string', 'null'], format: 'uuid' },
                nomor_telepon: { type: ['string', 'null'] },
                status: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [validate(schema.createUserSchema)]
  }, controller.createHandler);

  // GET - Dapatkan detail user by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail user berdasarkan ID',
      tags: ['Users'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID user yang ingin diambil',
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
                nama: { type: 'string' },
                email: { type: 'string', format: 'email' },
                role: { type: 'string' },
                companyId: { type: 'string', format: 'uuid' },
                company_id: { type: ['string', 'null'], format: 'uuid' },
                nomor_telepon: { type: ['string', 'null'] },
                status: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' }
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
    preHandler: [validate(schema.userIdParamSchema)]
  }, controller.getByIdHandler);

  // PATCH - Update user
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate data user',
      tags: ['Users'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID user yang ingin diupdate',
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
            description: 'Nama user baru',
            example: 'John Doe Updated'
          },
          role: {
            type: 'string',
            enum: ['super_admin', 'admin', 'manager', 'supervisor', 'staff', 'customer'],
            description: 'Role user baru',
            example: 'admin'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan baru',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          nama: {
            type: 'string',
            minLength: 3,
            maxLength: 255
          },
          email: {
            type: 'string',
            format: 'email'
          },
          password: {
            type: 'string',
            minLength: 6
          },
          company_id: {
            type: 'string',
            format: 'uuid'
          },
          nomor_telepon: {
            type: 'string'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive']
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
    preHandler: [validate(schema.updateUserSchema)]
  }, controller.updateHandler);

  // DELETE - Hapus user
  fastify.delete('/:id', {
    schema: {
      description: 'Menghapus user dari sistem',
      tags: ['Users'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID user yang ingin dihapus',
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
    preHandler: [validate(schema.userIdParamSchema)]
  }, controller.deleteHandler);
}
