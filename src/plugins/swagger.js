// src/plugins/swagger.js
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Menghapus keyword OpenAPI yang tidak dikenali AJV:
 * - example
 * - examples
 */
export function removeExamples(schema) {
  if (Array.isArray(schema)) {
    return schema.map(removeExamples);
  }

  if (schema && typeof schema === 'object') {
    const cleaned = {};

    for (const [key, value] of Object.entries(schema)) {
      if (key === 'example' || key === 'examples') continue;
      cleaned[key] = removeExamples(value);
    }

    return cleaned;
  }

  return schema;
}

async function swaggerPlugin(fastify) {
  // setValidatorCompiler dipindahkan ke src/plugins/validator.js supaya aturan
  // validasi tetap sama di development maupun produksi — plugin ini hanya
  // diregistrasi di development, jadi tidak boleh memuat perilaku runtime.

  // Register OpenAPI documentation generator
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'PropTrack API v2.0',
        description: 'Dokumentasi API untuk Sistem Multi-Tenant PropTrack',
        version: '2.0.0'
      },

      servers: [
        {
          url: process.env.API_URL || 'http://localhost:3000',
          description: 'API Server'
        }
      ],

      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },

        parameters: {
          tenantIdHeader: {
            name: 'x-tenant-id',
            in: 'header',
            description: 'Tenant ID untuk multi-tenant scope',
            required: true,
            schema: {
              type: 'string'
            },
          },

          paginationLimit: {
            name: 'limit',
            in: 'query',
            description: 'Jumlah data per halaman',
            required: false,
            schema: {
              type: 'integer',
              default: 10,
              minimum: 1
            },
          },

          paginationOffset: {
            name: 'offset',
            in: 'query',
            description: 'Offset data untuk pagination',
            required: false,
            schema: {
              type: 'integer',
              default: 0,
              minimum: 0
            },
          }
        }
      },

      security: [{ bearerAuth: [] }]
    }
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecificationClone: true
  });
}

export default fp(swaggerPlugin);