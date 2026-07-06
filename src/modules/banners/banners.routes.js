import * as controller from './banners.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

export default async function bannersRoutes(fastify, options) {
  // Hanya super_admin yang bisa mengelola banner
  fastify.addHook('onRequest', requireAuth);
  fastify.addHook('onRequest', requireRole(['super_admin']));

  fastify.get('/', controller.getAllHandler);
  fastify.get('/:id', controller.getByIdHandler);
  fastify.post('/', controller.createHandler);
  fastify.put('/:id', controller.updateHandler);
  fastify.delete('/:id', controller.deleteHandler);
}
