import { createSyncController } from './sync.controller.js';
import { createSyncService, bearerTokenMatches } from './sync.service.js';

export default async function syncRoutes(fastify, options = {}) {
  const service = options.service || createSyncService();
  const controller = createSyncController(service);

  fastify.addHook('onRequest', async (request, reply) => {
    if (!bearerTokenMatches(request, options.token)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  fastify.get('/events', controller.listEvents);
  fastify.get('/snapshot/:entity', controller.snapshot);
  fastify.get('/checksum/:entity', controller.checksum);
}
