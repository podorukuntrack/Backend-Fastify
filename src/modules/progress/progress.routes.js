import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './progress.schema.js';
import * as controller from './progress.controller.js';

export default async function progressRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);

  const readRoles = authorize('super_admin', 'admin', 'customer');
  const writeRoles = authorize('super_admin', 'admin');

  // Customer bisa melihat semua progress & spesifik unit
  fastify.get('/', { preHandler: [readRoles] }, controller.getAllHandler);
  
  fastify.get('/:id', { 
    preHandler: [readRoles, validate(schema.paramIdSchema)] 
  }, controller.getByIdHandler);

  // Sesuai desain: GET /units/:id/progress
  fastify.get('/unit/:id', { 
    preHandler: [readRoles, validate(schema.paramIdSchema)] 
  }, controller.getByUnitHandler);

  // Write roles
  fastify.post('/', { 
    preHandler: [writeRoles, validate(schema.createProgressSchema)] 
  }, controller.createHandler);
  
  fastify.patch('/:id', { 
    preHandler: [writeRoles, validate(schema.updateProgressSchema)] 
  }, controller.updateHandler);
  
  fastify.delete('/:id', { 
    preHandler: [writeRoles, validate(schema.paramIdSchema)] 
  }, controller.deleteHandler);
}