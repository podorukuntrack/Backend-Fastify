import { createHash, timingSafeEqual } from 'node:crypto';
import { BUSINESS_FIELDS, assertEntity } from './sync.config.js';

let repositoryPromise;

async function getRepository(repository) {
  if (repository) return repository;
  repositoryPromise ??= import('./sync.repository.js');
  return repositoryPromise;
}

export function pickBusinessFields(entity, row) {
  assertEntity(entity);
  const source = row && typeof row === 'object' ? row : {};
  return Object.fromEntries(
    BUSINESS_FIELDS[entity]
      .filter((field) => Object.prototype.hasOwnProperty.call(source, field))
      .map((field) => [field, source[field]])
  );
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function parseIntValue(value, fallback, { max, name }) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) {
    const error = new Error(`${name} must be a non-negative integer`);
    error.statusCode = 400;
    throw error;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) {
    const error = new Error(`${name} is out of range`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

export function parseLimit(value) {
  return parseIntValue(value, 500, { max: 1000, name: 'limit' }) || 1;
}

export function parseAfterSeq(value) {
  return parseIntValue(value, 0, { max: Number.MAX_SAFE_INTEGER, name: 'after_seq' });
}

export function parsePageAfterId(value) {
  if (value === undefined || value === null || value === '') return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))) {
    const error = new Error('page_after_id must be a UUID');
    error.statusCode = 400;
    throw error;
  }
  return String(value);
}

export function createSyncService({ repository } = {}) {
  return {
    async listEvents({ afterSeq, limit }) {
      const repo = await getRepository(repository);
      const rows = await repo.listEvents({ afterSeq, limit });
      return rows.map((event) => ({
        seq: Number(event.seq),
        entity: event.entity,
        entity_id: event.entity_id,
        operation: event.operation,
        occurred_at: event.occurred_at,
        data: pickBusinessFields(event.entity, event.payload),
      }));
    },

    async getSnapshot({ entity, pageAfterId, limit }) {
      assertEntity(entity);
      const repo = await getRepository(repository);
      const maxSeq = Number(await repo.getMaxSeq());
      const rows = await repo.getSnapshotRows({ entity, pageAfterId, limit: limit + 1 });
      const hasMore = rows.length > limit;
      return {
        rows: rows.slice(0, limit).map((row) => pickBusinessFields(entity, row)),
        has_more: hasMore,
        max_seq: maxSeq,
      };
    },

    async getChecksum({ entity }) {
      assertEntity(entity);
      const repo = await getRepository(repository);
      const rows = await repo.getSnapshotRows({ entity, pageAfterId: null, limit: null });
      const canonical = rows.map((row) => stableValue(pickBusinessFields(entity, row)));
      const hash = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
      return { count: rows.length, hash };
    },
  };
}

export function bearerTokenMatches(request, expectedToken) {
  const header = request.headers.authorization;
  const match = typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i) : null;
  if (!match || !expectedToken) return false;
  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
