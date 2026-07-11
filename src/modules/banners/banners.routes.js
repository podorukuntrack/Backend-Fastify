import * as controller from './banners.controller.js';
import { authorize } from '../../middleware/authorize.js';

export default async function bannersRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  // GET boleh diakses semua role yg sudah login (customer, admin, super_admin)
  // agar mobile app bisa mengambil daftar banner untuk ditampilkan di homepage
  fastify.get('/', controller.getAllHandler);
  fastify.get('/:id', controller.getByIdHandler);

  // Operasi tulis hanya untuk super_admin
  fastify.post('/', { preHandler: [authorize('super_admin')] }, controller.createHandler);
  fastify.put('/:id', { preHandler: [authorize('super_admin')] }, controller.updateHandler);
  fastify.delete('/:id', { preHandler: [authorize('super_admin')] }, controller.deleteHandler);
}
