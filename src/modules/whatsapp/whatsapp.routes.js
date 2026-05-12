import { authorize } from '../../middleware/authorize.js';
import * as controller from './whatsapp.controller.js';

export default async function whatsappRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', authorize('super_admin', 'admin', 'customer_service'));

  fastify.post('/send', controller.sendHandler);
  fastify.get('/logs', controller.getLogsHandler); // Ambil data dari tabel whatsapp_logs
}