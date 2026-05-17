// src/modules/handovers/handover.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './handover.schema.js';
import * as controller from './handover.controller.js';

export default async function handoverRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'admin', 'customer');
  const writeRoles = authorize('super_admin', 'admin');

  // GET - Dapatkan semua handover/serah terima
  fastify.get('/', {
    schema: {
      description: 'Mendapatkan daftar semua serah terima unit (handover)',
      tags: ['Handovers'],
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
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'Filter berdasarkan ID unit',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          status: {
            type: 'string',
            description: 'Filter berdasarkan status serah terima',
            example: 'dijadwalkan'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'array' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles]
  }, controller.getAllHandler);

  // GET - Detail handover by ID
  fastify.get('/:id', {
    schema: {
      description: 'Mendapatkan detail serah terima unit beserta defect reports',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID handover/serah terima',
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
            data: { type: 'object' }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles]
  }, controller.getByIdHandler);

  // POST - Buat handover/serah terima baru
  fastify.post('/', {
    schema: {
      description: 'Membuat jadwal serah terima unit baru',
      tags: ['Handovers'],
      body: {
        type: 'object',
        required: ['unitId', 'scheduledDate'],
        properties: {
          unitId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Unit yang akan diserah terimakan',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          scheduledDate: {
            type: 'string',
            format: 'date-time',
            description: 'Tanggal jadwal serah terima (ISO-8601)',
            example: '2024-08-15T10:00:00Z'
          },
          status: {
            type: 'string',
            description: 'Status awal (default: menunggu_respon_customer)',
            example: 'menunggu_respon_customer'
          },
          notes: {
            type: 'string',
            description: 'Catatan atau instruksi serah terima',
            example: 'Serah terima disertai dengan pemeriksaan kelengkapan fasilitas'
          },
          companyId: {
            type: 'string',
            format: 'uuid',
            description: 'ID Perusahaan (optional)',
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
    preHandler: [writeRoles, validate(schema.createHandoverSchema)]
  }, controller.createHandler);
  
  // PATCH - Update handover
  fastify.patch('/:id', {
    schema: {
      description: 'Mengupdate status dan informasi serah terima',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID handover yang ingin diupdate',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Status serah terima baru',
            example: 'dijadwalkan'
          },
          scheduledDate: {
            type: ['string', 'null'],
            format: 'date-time'
          },
          proposedDate: {
            type: ['string', 'null'],
            format: 'date-time'
          },
          actualDate: {
            type: ['string', 'null'],
            format: 'date-time'
          },
          notes: {
            type: 'string',
            description: 'Catatan pembaruan',
            example: 'Serah terima sudah dilaksanakan, semua fasilitas OK'
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
    preHandler: [writeRoles, validate(schema.updateHandoverSchema)]
  }, controller.updateHandler);

  // POST - Lapor defect/kerusakan saat serah terima
  fastify.post('/:id/defects', {
    schema: {
      description: 'Melaporkan defect/kerusakan yang ditemukan saat serah terima',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID handover untuk melaporkan defect',
            example: '550e8400-e29b-41d4-a716-446655440000'
          }
        }
      },
      body: {
        type: 'object',
        required: ['description'],
        properties: {
          description: {
            type: 'string',
            minLength: 5,
            description: 'Deskripsi detail defect/kerusakan',
            example: 'Cat dinding di sudut timur ruang tamu terlihat mengelupas'
          },
          imageUrl: {
            type: 'string',
            format: 'uri',
            description: 'URL foto bukti defect (optional)',
            example: 'https://example.com/defect-photo.jpg'
          },
          status: {
            type: 'string',
            enum: ['reported', 'fixing', 'resolved'],
            description: 'Status defect (default: reported)',
            example: 'reported'
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
    preHandler: [writeRoles, validate(schema.defectSchema)]
  }, controller.createDefectHandler);

  // PATCH - Customer merespon jadwal
  fastify.patch('/:id/respond', {
    schema: {
      description: 'Customer merespon (ACC/Reschedule) jadwal serah terima',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['dijadwalkan', 'menunggu_konfirmasi_admin'] },
          proposedDate: { type: 'string', format: 'date-time', nullable: true },
          notes: { type: 'string', nullable: true }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.respondHandoverSchema)]
  }, controller.respondHandler);

  // PATCH - Customer konfirmasi selesai
  fastify.patch('/:id/confirm', {
    schema: {
      description: 'Customer mengkonfirmasi bahwa serah terima telah selesai di hari H',
      tags: ['Handovers'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      security: [{ bearerAuth: [] }]
    },
    preHandler: [readRoles, validate(schema.confirmHandoverSchema)]
  }, controller.confirmHandler);
}