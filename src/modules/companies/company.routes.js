// src/modules/companies/company.routes.js

import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

import * as schema from './company.schema.js';
import * as controller from './company.controller.js';

export default async function companyRoutes(fastify, options) {

  // Semua route wajib login
  fastify.addHook('preValidation', fastify.authenticate);

  // ======================================================
  // GET ALL COMPANIES
  // super_admin + admin boleh lihat
  // ======================================================

  fastify.get(
    '/',
    {
      preHandler: [
        authorize('super_admin', 'admin')
      ],

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
                    id: {
                      type: 'string',
                      format: 'uuid'
                    },

                    name: {
                      type: 'string'
                    },

                    nama_pt: {
                      type: 'string'
                    },

                    kode_pt: {
                      type: 'string'
                    },

                    alamat: {
                      type: 'string'
                    },

                    logo_url: {
                      type: 'string'
                    },

                    createdAt: {
                      type: 'string',
                      format: 'date-time'
                    },

                    created_at: {
                      type: 'string',
                      format: 'date-time'
                    }
                  }
                }
              }
            }
          }
        },

        security: [{ bearerAuth: [] }]
      }
    },

    controller.getAllHandler
  );

  // ======================================================
  // CREATE COMPANY
  // hanya super_admin
  // ======================================================

  fastify.post(
    '/',
    {
      preHandler: [
        authorize('super_admin'),
        validate(schema.createCompanySchema)
      ],

      schema: {
        description: 'Membuat perusahaan baru',

        tags: ['Companies'],

        body: {
          type: 'object',

          required: [],

          properties: {
            name: {
              type: 'string',
              minLength: 3,
              maxLength: 255,
              description: 'Nama perusahaan',
              example: 'PT. Maju Jaya Indonesia'
            },

            nama_pt: {
              type: 'string',
              minLength: 3,
              maxLength: 255,
              description: 'Nama perusahaan',
              example: 'PT. Maju Jaya Indonesia'
            },

            kode_pt: {
              type: 'string'
            },

            alamat: {
              type: 'string'
            },

            logo_url: {
              type: 'string'
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
                  id: {
                    type: 'string',
                    format: 'uuid'
                  },

                  name: {
                    type: 'string'
                  },

                  nama_pt: {
                    type: 'string'
                  },

                  kode_pt: {
                    type: 'string'
                  },

                  alamat: {
                    type: 'string'
                  },

                  logo_url: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },

        security: [{ bearerAuth: [] }]
      }
    },

    controller.createHandler
  );

  // ======================================================
  // GET COMPANY BY ID
  // super_admin + admin boleh lihat
  // ======================================================

  fastify.get(
    '/:id',
    {
      preHandler: [
        authorize('super_admin', 'admin'),
        validate(schema.companyIdParamSchema)
      ],

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
                  id: {
                    type: 'string',
                    format: 'uuid'
                  },

                  name: {
                    type: 'string'
                  },

                  nama_pt: {
                    type: 'string'
                  },

                  kode_pt: {
                    type: 'string'
                  },

                  alamat: {
                    type: 'string'
                  },

                  logo_url: {
                    type: 'string'
                  },

                  createdAt: {
                    type: 'string',
                    format: 'date-time'
                  },

                  created_at: {
                    type: 'string',
                    format: 'date-time'
                  }
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
      }
    },

    controller.getByIdHandler
  );

  // ======================================================
  // UPDATE COMPANY
  // hanya super_admin
  // ======================================================

  fastify.patch(
    '/:id',
    {
      preHandler: [
        authorize('super_admin'),
        validate(schema.updateCompanySchema)
      ],

      schema: {
        description: 'Mengupdate data perusahaan',

        tags: ['Companies']
      }
    },

    controller.updateHandler
  );

  // ======================================================
  // DELETE COMPANY
  // hanya super_admin
  // ======================================================

  fastify.delete(
    '/:id',
    {
      preHandler: [
        authorize('super_admin'),
        validate(schema.companyIdParamSchema)
      ],

      schema: {
        description: 'Menghapus perusahaan dari sistem',

        tags: ['Companies']
      }
    },

    controller.deleteHandler
  );
}