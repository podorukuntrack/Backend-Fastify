import * as controller from './banners.controller.js';
import { authorize } from '../../middleware/authorize.js';

export default async function bannersRoutes(fastify, options) {
  // Hanya super_admin yang bisa mengelola banner
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/', { preHandler: [authorize('super_admin')] }, controller.getAllHandler);
  fastify.get('/:id', { preHandler: [authorize('super_admin')] }, controller.getByIdHandler);
  fastify.post('/', { preHandler: [authorize('super_admin')] }, controller.createHandler);
  fastify.put('/:id', { preHandler: [authorize('super_admin')] }, controller.updateHandler);
  fastify.delete('/:id', { preHandler: [authorize('super_admin')] }, controller.deleteHandler);
}
