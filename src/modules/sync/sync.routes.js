import { createSyncController } from './sync.controller.js';
import { createSyncService, bearerTokenMatches } from './sync.service.js';

export default async function syncRoutes(fastify, options = {}) {
  const service = options.service || createSyncService();
  const controller = createSyncController(service);

  fastify.addHook('onRequest', async (request, reply) => {
    if (!bearerTokenMatches(request, process.env.SYNC_READ_TOKEN)) {
      return reply.code(401).send({ success: false, message: 'Unauthorized' });
    }
  });

  fastify.get('/events', controller.listEvents);
  fastify.get('/snapshot/:entity', controller.snapshot);
  fastify.get('/checksum/:entity', controller.checksum);
}
