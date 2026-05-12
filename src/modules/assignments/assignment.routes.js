import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './assignment.schema.js';
import * as controller from './assignment.controller.js';

export default async function assignmentRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Hanya super_admin & admin
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  fastify.get('/', controller.getAllHandler);
  fastify.post('/', { preHandler: [validate(schema.createAssignmentSchema)] }, controller.createHandler);
  fastify.get('/:id', { preHandler: [validate(schema.assignmentIdParamSchema)] }, controller.getByIdHandler);
  fastify.patch('/:id', { preHandler: [validate(schema.updateAssignmentSchema)] }, controller.updateHandler);
}