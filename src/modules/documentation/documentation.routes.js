// src/modules/documentation/documentation.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './documentation.schema.js';
import * as controller from './documentation.controller.js';

export default async function documentationRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  // Customer bisa melihat dokumen unitnya
  fastify.get('/units/:id/documentation', {
    preHandler: [
      authorize('super_admin', 'admin', 'customer'), 
      validate(schema.unitIdParamSchema)
    ]
  }, controller.getByUnitHandler);

  // Hanya admin dan super_admin yang bisa upload & hapus file
  fastify.post('/documentation/upload', {
    preHandler: authorize('super_admin', 'admin')
  }, controller.uploadHandler);

  fastify.delete('/documentation/:id', {
    preHandler: [
      authorize('super_admin', 'admin'), 
      validate(schema.docIdParamSchema)
    ]
  }, controller.deleteHandler);
}