import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './unit.schema.js';
import * as controller from './unit.controller.js';

// =============================
// CONSTANTS
// =============================
const STATUS_PEMBANGUNAN = [
  'planned',
  'pondasi',
  'struktur',
  'finishing',
  'ready',
  'handover',
];

// =============================
// COMMON SCHEMAS (DRY)
// =============================
const baseUnitProperties = {
  id: { type: 'string', format: 'uuid' },
  clusterId: { type: 'string', format: 'uuid' },
  nomorUnit: { type: 'string' },
  tipeRumah: { type: 'string' },
  luasTanah: { type: 'number' },
  luasBangunan: { type: 'number' },
  statusPembangunan: { type: 'string', enum: STATUS_PEMBANGUNAN },
  progressPercentage: { type: 'integer' },
};

const buildResponse = (dataSchema, isArray = false) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: isArray
      ? {
          type: 'array',
          items: dataSchema,
        }
      : dataSchema,
  },
});

const unitSchemaObject = {
  type: 'object',
  properties: baseUnitProperties,
};

// =============================
// ROUTES
// =============================
export default async function unitRoutes(fastify) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'admin', 'customer');
  const writeRoles = authorize('super_admin', 'admin');

  // =============================
  // GET ALL
  // =============================
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all units',
        tags: ['Units'],
        querystring: schema.getUnitsQuerySchema,
        response: {
          200: buildResponse(unitSchemaObject, true),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [readRoles, validate(schema.getUnitsQuerySchema)],
    },
    controller.getAllHandler
  );

  // =============================
  // GET BY ID
  // =============================
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get unit by ID',
        tags: ['Units'],
        params: schema.unitIdParamSchema,
        response: {
          200: buildResponse(unitSchemaObject),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [readRoles, validate(schema.unitIdParamSchema)],
    },
    controller.getByIdHandler
  );

  // =============================
  // GET DETAIL (JOIN)
  // =============================
  fastify.get(
    '/:id/detail',
    {
      schema: {
        description: 'Get unit detail with cluster & project',
        tags: ['Units'],
        params: schema.unitIdParamSchema,
        response: {
          200: buildResponse({
            type: 'object',
            properties: {
              ...baseUnitProperties,
              cluster: { type: 'object' },
              project: { type: 'object' },
            },
          }),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [readRoles, validate(schema.unitIdParamSchema)],
    },
    controller.getDetailHandler
  );

  // =============================
  // CREATE
  // =============================
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create new unit',
        tags: ['Units'],
        body: schema.createUnitSchema,
        response: {
          201: buildResponse(unitSchemaObject),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [writeRoles, validate(schema.createUnitSchema)],
    },
    controller.createHandler
  );

  // =============================
  // BULK CREATE
  // =============================
  fastify.post(
    '/bulk/create',
    {
      schema: {
        description: 'Create multiple units',
        tags: ['Units'],
        body: schema.bulkCreateUnitsSchema,
        response: {
          201: buildResponse(unitSchemaObject, true),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [writeRoles, validate(schema.bulkCreateUnitsSchema)],
    },
    controller.bulkCreateHandler
  );

  // =============================
  // UPDATE
  // =============================
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update unit',
        tags: ['Units'],
        params: schema.unitIdParamSchema,
        body: schema.updateUnitSchema,
        response: {
          200: buildResponse(unitSchemaObject),
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [writeRoles, validate(schema.updateUnitSchema)],
    },
    controller.updateHandler
  );

  // =============================
  // DELETE
  // =============================
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete unit',
        tags: ['Units'],
        params: schema.unitIdParamSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      preHandler: [writeRoles, validate(schema.unitIdParamSchema)],
    },
    controller.deleteHandler
  );
}