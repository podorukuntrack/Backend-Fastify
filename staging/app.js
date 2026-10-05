import Fastify from 'fastify';
import syncRoutes, { syncRoutesV2 } from '../src/modules/sync/sync.routes.js';
import { createSyncService } from '../src/modules/sync/sync.service.js';
import { createSyncRepository } from '../src/modules/sync/sync.repository.js';
import { bearerTokenMatches } from '../src/modules/sync/sync.service.js';
export const STAGING_ALLOWED_IPS = ['127.0.0.1', '::1', '10.11.20.216'];
export async function buildStagingApp(db, token, allowedIPs = STAGING_ALLOWED_IPS, monitorToken) {
  if (!/^[0-9a-f]{64,}$/i.test(token ?? '')) throw new Error('Token must be random hex, at least 32 bytes');
  if (monitorToken !== undefined && (!/^[0-9a-f]{64}$/i.test(monitorToken) || monitorToken === token))
    throw new Error('Independent 32-byte monitor token required');
  const app = Fastify({ logger: false, trustProxy: false });
  app.setErrorHandler((error, _request, reply) => {
    const code = error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    reply.code(code).send({ message: code === 500 ? 'Internal server error' : error.message });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ message: 'Not found' }));
  app.addHook('onRequest', async (request, reply) => {
    if (!allowedIPs.includes(request.ip)) return reply.code(403).send({ message: 'Forbidden' });
    if (bearerTokenMatches(request, monitorToken) && !(request.method === 'GET' &&
      (request.routeOptions.url === '/health' || request.routeOptions.config.monitorChecksum === true)))
      return reply.code(403).send({ message: 'Forbidden' });
  });
  app.get('/health', async () => { await db`SELECT 1`; return { status: 'ok' }; });
  const service = createSyncService({ repository: createSyncRepository(db) });
  await app.register(syncRoutes, { prefix: '/sync/v1', token, service });
  await app.register(syncRoutesV2, { prefix: '/sync/v2', token, monitorToken, service });
  return app;
}
