// src/plugins/swagger.js
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Ajv from 'ajv';

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
  /**
   * Buat instance AJV sendiri.
   * Fastify akan menggunakan compiler ini untuk semua route schema.
   */
  const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: false,
    allErrors: true,
    strict: false
  });

  /**
   * Compiler global untuk seluruh schema.
   * Semua keyword `example` dibersihkan terlebih dahulu.
   */
  fastify.setValidatorCompiler(({ schema }) => {
    const cleanedSchema = removeExamples(schema);
    return ajv.compile(cleanedSchema);
  });

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
          url: 'http://localhost:3000',
          description: 'Development Server'
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
            example: 'company-123'
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
            example: 10
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
            example: 0
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