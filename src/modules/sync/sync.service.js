import { timingSafeEqual } from 'node:crypto';
import { BUSINESS_FIELDS, assertEntity } from './sync.config.js';
export function pickBusinessFields(entity, row) {
  assertEntity(entity);
  return Object.fromEntries(BUSINESS_FIELDS[entity].filter(k => Object.hasOwn(row ?? {}, k)).map(k => [k, row[k]]));
}
function integer(value, fallback, max, name) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max)
    throw Object.assign(new Error(`${name} tidak valid`), { statusCode: 400 });
  return Number(value);
}
export function parseLimit(value) {
  const n = integer(value, 500, 1000, 'limit');
  if (!n) throw Object.assign(new Error('limit tidak valid'), { statusCode: 400 });
  return n;
}
export const parseAfterSeq = value => integer(value, 0, Number.MAX_SAFE_INTEGER, 'after_seq');
export function parsePageAfterId(value) {
  if (value === undefined) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value)))
    throw Object.assign(new Error('page_after_id tidak valid'), { statusCode: 400 });
  return value.toLowerCase();
}
function safeNumber(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Sync integer outside supported range');
  return n;
}
// v2 cursor "<txid>:<seq>": both parts unsigned decimal within the safe integer range.
export function parseCursorV2(value, name = 'after') {
  if (value === undefined) return { afterTxid: 0, afterSeq: 0 };
  const m = /^(\d{1,16}):(\d{1,16})$/.exec(String(value));
  if (!m || !Number.isSafeInteger(Number(m[1])) || !Number.isSafeInteger(Number(m[2])))
    throw Object.assign(new Error(`${name} tidak valid`), { statusCode: 400 });
  return { afterTxid: Number(m[1]), afterSeq: Number(m[2]) };
}
const cursorV2 = (txid, seq) => `${safeNumber(txid)}:${safeNumber(seq)}`;
function toEvent(e) {
  return { seq: safeNumber(e.seq), entity: e.entity, entity_id: e.entity_id, op: e.op, row_version: safeNumber(e.row_version),
    payload: e.op === 'D' ? null : pickBusinessFields(e.entity, e.payload), created_at: e.created_at };
}
export function createSyncService({ repository } = {}) {
  if (!repository) throw new Error('Guarded staging repository required');
  return {
    async listEvents({ afterSeq, limit }) {
      const rows = await repository.listEvents({ afterSeq, limit: limit + 1 });
      const events = rows.slice(0, limit).map(toEvent);
      return { events, next_after_seq: events.at(-1)?.seq ?? afterSeq, has_more: rows.length > limit, server_time: new Date().toISOString() };
    },
    async listEventsV2({ afterTxid, afterSeq, limit }) {
      const { rows, xmin, held } = await repository.listEventsV2({ afterTxid, afterSeq, limit: limit + 1 });
      const page = rows.slice(0, limit);
      const events = page.map(e => ({ ...toEvent(e), cursor: cursorV2(e.txid, e.seq) }));
      return { events, next_after: events.at(-1)?.cursor ?? cursorV2(afterTxid, afterSeq), has_more: rows.length > limit,
        // true: committed events exist past the watermark, waiting for an older open Track transaction
        held_by_open_transaction: Boolean(held), watermark: String(safeNumber(xmin)), server_time: new Date().toISOString() };
    },
    // Initial load: take this cursor BEFORE the first snapshot page, then replay events after it.
    async startCursorV2() {
      const { xmin } = await repository.startCursorV2();
      return { after: cursorV2(xmin, 0), server_time: new Date().toISOString() };
    },
    async getSnapshot({ entity, pageAfterId, limit }) {
      assertEntity(entity);
      const { rows, max_seq } = await repository.getSnapshot({ entity, pageAfterId, limit: limit + 1 });
      return { rows: rows.slice(0, limit).map(r => ({ ...pickBusinessFields(entity, r), row_version: safeNumber(r.row_version) })),
        has_more: rows.length > limit, max_seq: safeNumber(max_seq) };
    },
    async getChecksum({ entity }) { assertEntity(entity); return repository.getChecksum({ entity }); },
  };
}
export function bearerTokenMatches(request, expectedToken) {
  const match = request.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match || !expectedToken) return false;
  const a = Buffer.from(match[1]), b = Buffer.from(expectedToken);
  return a.length === b.length && timingSafeEqual(a, b);
}
