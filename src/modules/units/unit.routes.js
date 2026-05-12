import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './unit.schema.js';
import * as controller from './unit.controller.js';

export default async function unitRoutes(fastify, options) {
  // Autentikasi JWT berlaku untuk semua rute
  fastify.addHook('preValidation', fastify.authenticate);
  
  // === READ (Dapat diakses oleh Customer) ===
  const readRoles = authorize('super_admin', 'admin', 'customer');

  fastify.get('/', { 
    preHandler: [readRoles] 
  }, controller.getAllHandler);
  
  fastify.get('/:id', { 
    preHandler: [readRoles, validate(schema.unitIdParamSchema)] 
  }, controller.getByIdHandler);

  fastify.get('/:id/detail', { 
    preHandler: [readRoles, validate(schema.unitIdParamSchema)] 
  }, controller.getDetailHandler);


  // === WRITE / CRUD (Hanya dapat diakses oleh Admin & Super Admin) ===
  const writeRoles = authorize('super_admin', 'admin');

  fastify.post('/', { 
    preHandler: [writeRoles, validate(schema.createUnitSchema)] 
  }, controller.createHandler);
  
  fastify.patch('/:id', { 
    preHandler: [writeRoles, validate(schema.updateUnitSchema)] 
  }, controller.updateHandler);
  
  fastify.delete('/:id', { 
    preHandler: [writeRoles, validate(schema.unitIdParamSchema)] 
  }, controller.deleteHandler);
}