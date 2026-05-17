// src/modules/tickets/ticket.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './ticket.schema.js';
import * as controller from './ticket.controller.js';

export default async function ticketRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  // Semua role bisa akses tiket (terfilter otomatis lewat getTenantScope)
  const allRoles = authorize('super_admin', 'admin', 'customer_service', 'customer');

  // GET - Dapatkan semua tiket
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua tiket support/masalah',
      tags: ['Tickets'],
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
          status: {
            type: 'string',
            enum: ['open', 'in_progress', 'resolved', 'closed'],
            description: 'Filter berdasarkan status tiket',
            example: 'open'
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Filter berdasarkan prioritas',
            example: 'high'
          },
          search: {
            type: 'string',
            description: 'Cari tiket berdasarkan subject',
            example: 'Unit tidak sesuai spesifikasi'
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
                  subject: { type: 'string' },
                  status: { type: 'string' },
                  priority: { type: 'string' }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [allRoles]
  }, controller.getAllHandler);

  // GET - Detail tiket by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail tiket beserta riwayat pesan',
      tags: ['Tickets'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID tiket yang ingin diambil',
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
                subject: { type: 'string' },
                status: { type: 'string' },
                priority: { type: 'string' },
                messages: { type: 'array' }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [allRoles]
  }, controller.getByIdHandler);
  
  // POST - Buat tiket baru
  fastify.post('/', {
    schema: {
      description: 'Membuat tiket support/masalah baru',
      tags: ['Tickets'],
      body: {
        type: 'object',
        required: ['subject'],
        properties: {
          subject: {
            type: 'string',
            minLength: 5,
            maxLength: 255,
            description: 'Judul/subjek tiket masalah',
            example: 'Unit A-101 tidak sesuai dengan spesifikasi'
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Prioritas tiket (default: normal)',
            example: 'high'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional)',
            example: '550e8400-e29b-41d4-a716-446655440000'
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
    preHandler: [allRoles, validate(schema.createTicketSchema)]
  }, controller.createHandler);
  
  // PATCH - Update status tiket
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate status dan prioritas tiket',
      tags: ['Tickets'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID tiket yang ingin diupdate',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'in_progress', 'resolved', 'closed'],
            description: 'Status tiket baru',
            example: 'resolved'
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Prioritas tiket baru',
            example: 'normal'
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
    preHandler: [authorize('super_admin', 'admin', 'customer_service'), validate(schema.updateTicketSchema)]
  }, controller.updateHandler);

  // GET - Dapatkan pesan dalam tiket
  fastify.get('/:id/messages', {
    schema: {
      description: 'Mendapatkan daftar pesan/balasan dalam tiket',
      tags: ['Tickets'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID tiket untuk melihat pesan-pesannya',
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
                  message: { type: 'string' },
                  sender: { type: 'object' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [allRoles]
  }, controller.getMessagesHandler);

  // POST - Tambah pesan balasan di tiket
  fastify.post('/:id/messages', {
    schema: {
      description: 'Menambahkan pesan balasan/diskusi dalam tiket',
      tags: ['Tickets'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID tiket untuk menambah pesan',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            minLength: 1,
            description: 'Isi pesan balasan',
            example: 'Sudah ditinjau oleh tim kami. Tim teknis akan segera menghubungi Anda.'
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
    preHandler: [allRoles, validate(schema.messageSchema)]
  }, controller.addMessageHandler);
}