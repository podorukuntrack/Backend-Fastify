import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './retention.schema.js';
import * as controller from './retention.controller.js';

export default async function retentionRoutes(fastify, options) {
  // Semua request wajib lolos JWT
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Hanya super_admin & admin yang bisa mengelola retensi
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  fastify.get('/', controller.getAllHandler);
  
  fastify.get('/:id', { 
    preHandler: [validate(schema.retentionIdParamSchema)] 
  }, controller.getByIdHandler);
  
  fastify.post('/', { 
    preHandler: [validate(schema.createRetentionSchema)] 
  }, controller.createHandler);
  
  fastify.patch('/:id', { 
    preHandler: [validate(schema.updateRetentionSchema)] 
  }, controller.updateHandler);
  
  fastify.delete('/:id', { 
    preHandler: [validate(schema.retentionIdParamSchema)] 
  }, controller.deleteHandler);
}