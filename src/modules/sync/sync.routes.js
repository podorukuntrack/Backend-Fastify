import { createSyncController } from './sync.controller.js';
import { createSyncService, bearerTokenMatches } from './sync.service.js';

function setup(fastify, options) {
  const controller = createSyncController(options.service || createSyncService());
  fastify.addHook('onRequest', async (request, reply) => {
    if (!bearerTokenMatches(request, options.token)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }
  });
  return controller;
}

export default async function syncRoutes(fastify, options = {}) {
  const controller = setup(fastify, options);
  fastify.get('/events', controller.listEvents);
  fastify.get('/snapshot/:entity', controller.snapshot);
  fastify.get('/checksum/:entity', controller.checksum);
}

// v2 changes only the event cursor (commit order). Snapshot and checksum are identical to v1.
export async function syncRoutesV2(fastify, options = {}) {
  const controller = setup(fastify, options);
  fastify.get('/events', controller.listEventsV2);
  fastify.get('/start', controller.startV2);
  fastify.get('/snapshot/:entity', controller.snapshot);
  fastify.get('/checksum/:entity', controller.checksum);
}
