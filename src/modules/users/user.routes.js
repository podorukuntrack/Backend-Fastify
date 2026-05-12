// src/modules/users/user.routes.js
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as schema from './user.schema.js';
import * as controller from './user.controller.js';

export default async function userRoutes(fastify, options) {
  fastify.addHook('preValidation', fastify.authenticate);
  
  // Sesuai Permission Matrix: Hanya super_admin dan admin yang bisa CRUD users
  fastify.addHook('preHandler', authorize('super_admin', 'admin'));

  fastify.get('/', { 
    preHandler: [validate(schema.queryUserSchema)] 
  }, controller.getAllHandler);
  
  fastify.post('/', { 
    preHandler: [validate(schema.createUserSchema)] 
  }, controller.createHandler);
  
  fastify.get('/:id', { 
    preHandler: [validate(schema.userIdParamSchema)] 
  }, controller.getByIdHandler);
  
  fastify.patch('/:id', { 
    preHandler: [validate(schema.updateUserSchema)] 
  }, controller.updateHandler);
  
  fastify.delete('/:id', { 
    preHandler: [validate(schema.userIdParamSchema)] 
  }, controller.deleteHandler);
}