// src/plugins/swagger.js
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async function (fastify, opts) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'PropTrack API v2.0',
        description: 'Dokumentasi API untuk Sistem Multi-Tenant PropTrack',
        version: '2.0.0',
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
            bearerFormat: 'JWT',
          }
        },
        parameters: {
          tenantIdHeader: {
            name: 'x-tenant-id',
            in: 'header',
            description: 'Tenant ID untuk multi-tenant scope',
            required: true,
            schema: {
              type: 'string',
              example: 'company-123'
            }
          },
          paginationLimit: {
            name: 'limit',
            in: 'query',
            description: 'Jumlah data per halaman',
            required: false,
            schema: {
              type: 'integer',
              default: 10
            }
          },
          paginationOffset: {
            name: 'offset',
            in: 'query',
            description: 'Offset data untuk pagination',
            required: false,
            schema: {
              type: 'integer',
              default: 0
            }
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    uiHooks: {
      onRequest: (request, reply, next) => next(),
      preHandler: (request, reply, next) => next()
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => swaggerObject,
    transformSpecificationClone: true
  });
});
