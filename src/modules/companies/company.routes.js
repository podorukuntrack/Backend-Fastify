// src/modules/companies/company.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './company.schema.js';
import * as controller from './company.controller.js';

export default async function companyRoutes(fastify, options) {
  // Semua route di sini wajib authenticate & role super_admin
  fastify.addHook('preValidation', fastify.authenticate);
  fastify.addHook('preHandler', authorize('super_admin'));

  fastify.get('/', controller.getAllHandler);
  
  fastify.post('/', { 
    preHandler: [validate(schema.createCompanySchema)] 
  }, controller.createHandler);
  
  fastify.get('/:id', { 
    preHandler: [validate(schema.companyIdParamSchema)] 
  }, controller.getByIdHandler);
  
  fastify.patch('/:id', { 
    preHandler: [validate(schema.updateCompanySchema)] 
  }, controller.updateHandler);
  
  fastify.delete('/:id', { 
    preHandler: [validate(schema.companyIdParamSchema)] 
  }, controller.deleteHandler);
}