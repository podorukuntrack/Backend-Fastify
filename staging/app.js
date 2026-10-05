import Fastify from 'fastify';
import syncRoutes, { syncRoutesV2 } from '../src/modules/sync/sync.routes.js';
import { createSyncService } from '../src/modules/sync/sync.service.js';
import { createSyncRepository } from '../src/modules/sync/sync.repository.js';
export async function buildStagingApp(db, token, allowedIPs = ['127.0.0.1', '::1']) {
  if (!/^[0-9a-f]{64,}$/i.test(token ?? '')) throw new Error('Token must be random hex, at least 32 bytes');
  const app = Fastify({ logger: false, trustProxy: false });
  app.setErrorHandler((error, _request, reply) => {
    const code = error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    reply.code(code).send({ message: code === 500 ? 'Internal server error' : error.message });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ message: 'Not found' }));
  app.addHook('onRequest', async (request, reply) => {
    if (!allowedIPs.includes(request.ip)) return reply.code(403).send({ message: 'Forbidden' });
  });
  app.get('/health', async () => { await db`SELECT 1`; return { status: 'ok' }; });
  const service = createSyncService({ repository: createSyncRepository(db) });
  await app.register(syncRoutes, { prefix: '/sync/v1', token, service });
  await app.register(syncRoutesV2, { prefix: '/sync/v2', token, service });
  return app;
}
