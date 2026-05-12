import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './cluster.schema.js';
import * as controller from './cluster.controller.js';

export default async function clusterRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Hanya super_admin dan admin yang memiliki akses ke modul Clusters
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  fastify.get('/', controller.getAllHandler);
  
  fastify.post('/', { 
    preHandler: [validate(schema.createClusterSchema)] 
  }, controller.createHandler);
  
  fastify.get('/:id', { 
    preHandler: [validate(schema.clusterIdParamSchema)] 
  }, controller.getByIdHandler);
  
  fastify.patch('/:id', { 
    preHandler: [validate(schema.updateClusterSchema)] 
  }, controller.updateHandler);
  
  fastify.delete('/:id', { 
    preHandler: [validate(schema.clusterIdParamSchema)] 
  }, controller.deleteHandler);
}