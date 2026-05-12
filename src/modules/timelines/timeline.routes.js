// src/modules/timelines/timeline.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './timeline.schema.js';
import * as controller from './timeline.controller.js';

export default async function timelineRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  fastify.get('/', controller.getAllHandler);
  fastify.post('/', { preHandler: [validate(schema.createTimelineSchema)] }, controller.createHandler);
  fastify.patch('/:id', { preHandler: [validate(schema.updateTimelineSchema)] }, controller.updateHandler);
  fastify.delete('/:id', { preHandler: [validate(schema.paramIdSchema)] }, controller.deleteHandler);
}