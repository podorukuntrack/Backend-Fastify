import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './project.schema.js';
import * as controller from './project.controller.js';

export default async function projectRoutes(fastify, options) {
  // Pastikan user memiliki JWT yang valid
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Sesuai Permission Matrix: Hanya super_admin dan admin yang bisa mengakses module ini
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  // Endpoints
  fastify.get('/', controller.getAllHandler);
  
  fastify.post('/', { 
    preHandler: [validate(schema.createProjectSchema)] 
  }, controller.createHandler);
  
  fastify.get('/:id', { 
    preHandler: [validate(schema.projectIdParamSchema)] 
  }, controller.getByIdHandler);
  
  fastify.patch('/:id', { 
    preHandler: [validate(schema.updateProjectSchema)] 
  }, controller.updateHandler);
  
  fastify.delete('/:id', { 
    preHandler: [validate(schema.projectIdParamSchema)] 
  }, controller.deleteHandler);

  // Endpoint khusus stats
  fastify.get('/:id/stats', { 
    preHandler: [validate(schema.projectIdParamSchema)] 
  }, controller.getStatsHandler);
}