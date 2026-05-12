// src/modules/tickets/ticket.routes.js
import { authorize } from '../../middleware/authorize.js';

import * as controller from './ticket.controller.js';

export default async function ticketRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  // Semua role bisa akses tiket (terfilter otomatis lewat getTenantScope)
  const allRoles = authorize('super_admin', 'admin', 'customer_service', 'customer');

  fastify.get('/', { preHandler: [allRoles] }, controller.getAllHandler);
  fastify.get('/:id', { preHandler: [allRoles] }, controller.getByIdHandler);
  
  // POST Ticket baru (Biasanya customer yang buat, tapi CS juga bisa buatkan)
  fastify.post('/', { preHandler: [allRoles] }, controller.createHandler);
  
  // PATCH Status Ticket (Hanya Admin & CS yang boleh tutup/ubah status)
  fastify.patch('/:id', { 
    preHandler: authorize('super_admin', 'admin', 'customer_service') 
  }, controller.updateHandler);

  // GET & POST Balasan Pesan dalam Tiket
  fastify.get('/:id/messages', { preHandler: [allRoles] }, controller.getMessagesHandler);
  fastify.post('/:id/messages', { preHandler: [allRoles] }, controller.addMessageHandler);
}