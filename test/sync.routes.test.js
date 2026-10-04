import Fastify from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import syncRoutes from '../src/modules/sync/sync.routes.js';
import { createSyncService, pickBusinessFields } from '../src/modules/sync/sync.service.js';
import { isSyncReadEnabled } from '../src/modules/sync/sync.config.js';

const TOKEN = 'local-test-token';

function makeApp(service) {
  const app = Fastify();
  process.env.NODE_ENV = 'test';
  process.env.SYNC_READ_ENABLED = 'true';
  process.env.SYNC_READ_TOKEN = TOKEN;
  return app.register(syncRoutes, { prefix: '/sync/v1', service });
}

describe('read-only sync API', () => {
  beforeEach(() => {
    process.env.SYNC_READ_TOKEN = TOKEN;
  });

  it('rejects a wrong bearer token with 401', async () => {
    const app = await makeApp({ listEvents: async () => [] });
    const response = await app.inject({ method: 'GET', url: '/sync/v1/events', headers: { authorization: 'Bearer wrong' } });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns ordered events with the default limit', async () => {
    const calls = [];
    const app = await makeApp({
      listEvents: async (input) => {
        calls.push(input);
        return [{ seq: 4, entity: 'companies', operation: 'update', data: { id: 'c1' } }];
      },
    });
    const response = await app.inject({ method: 'GET', url: '/sync/v1/events?after_seq=3', headers: { authorization: `Bearer ${TOKEN}` } });
    expect(response.statusCode).toBe(200);
    expect(calls[0]).toEqual({ afterSeq: 3, limit: 500 });
    expect(response.json().events[0].seq).toBe(4);
    await app.close();
  });

  it('returns an empty, valid snapshot and checksum', async () => {
    const app = await makeApp({
      getSnapshot: async () => ({ rows: [], has_more: false, max_seq: 0 }),
      getChecksum: async () => ({ count: 0, hash: 'empty-hash' }),
    });
    const headers = { authorization: `Bearer ${TOKEN}` };
    const snapshot = await app.inject({ method: 'GET', url: '/sync/v1/snapshot/companies', headers });
    const checksum = await app.inject({ method: 'GET', url: '/sync/v1/checksum/companies', headers });
    expect(snapshot.statusCode).toBe(200);
    expect(snapshot.json()).toEqual({ rows: [], has_more: false, max_seq: 0 });
    expect(checksum.json()).toEqual({ count: 0, hash: 'empty-hash' });
    await app.close();
  });

  it('does not expose secret fields through the business whitelist', () => {
    const row = pickBusinessFields('customers', {
      id: 'u1', email: 'customer@example.test', password_hash: 'do-not-return', refresh_token: 'do-not-return', api_token: 'do-not-return', role: 'customer',
    });
    expect(row).toEqual({ id: 'u1', email: 'customer@example.test', role: 'customer' });
    expect(row).not.toHaveProperty('password_hash');
    expect(row).not.toHaveProperty('refresh_token');
    expect(row).not.toHaveProperty('api_token');
  });

  it('does not activate PUT sync endpoints', async () => {
    const app = await makeApp({});
    const response = await app.inject({ method: 'PUT', url: '/sync/v1/schedules/example', headers: { authorization: `Bearer ${TOKEN}` } });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

describe('sync service', () => {
  it('never enables the sync routes in production or without an explicit environment', () => {
    expect(isSyncReadEnabled({ NODE_ENV: 'production', SYNC_READ_ENABLED: 'true', SYNC_READ_TOKEN: TOKEN })).toBe(false);
    expect(isSyncReadEnabled({ SYNC_READ_ENABLED: 'true', SYNC_READ_TOKEN: TOKEN })).toBe(false);
    expect(isSyncReadEnabled({ NODE_ENV: 'staging', SYNC_READ_ENABLED: 'true', SYNC_READ_TOKEN: TOKEN })).toBe(true);
  });

  it('enforces limit and sanitizes repository rows', async () => {
    const service = createSyncService({
      repository: {
        getMaxSeq: async () => 8,
        getSnapshotRows: async () => [{ id: 'c1', nama_pt: 'Dummy', password_hash: 'secret' }],
      },
    });
    const result = await service.getSnapshot({ entity: 'companies', pageAfterId: null, limit: 500 });
    expect(result.rows).toEqual([{ id: 'c1', nama_pt: 'Dummy' }]);
    expect(result).toMatchObject({ has_more: false, max_seq: 8 });
  });
});
