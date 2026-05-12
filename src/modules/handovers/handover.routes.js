// src/modules/handovers/handover.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './handover.schema.js';
import * as controller from './handover.controller.js';

export default async function handoverRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'admin', 'customer');
  const writeRoles = authorize('super_admin', 'admin');

  // GET Handovers (Customer bisa melihat status serah terima unitnya)
  fastify.get('/', { preHandler: [readRoles] }, controller.getAllHandler);
  fastify.get('/:id', { preHandler: [readRoles] }, controller.getByIdHandler);

  // POST / PATCH Handovers (Hanya Admin)
  fastify.post('/', { 
    preHandler: [writeRoles, validate(schema.createHandoverSchema)] 
  }, controller.createHandler);
  
  fastify.patch('/:id', { 
    preHandler: [writeRoles] 
  }, controller.updateHandler);

  // POST Defect - Laporan Kerusakan Saat Serah Terima (Admin yang mencatat)
  fastify.post('/:id/defects', { 
    preHandler: [writeRoles, validate(schema.defectSchema)] 
  }, controller.createDefectHandler);
}