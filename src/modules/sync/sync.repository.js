import { assertEntity } from './sync.config.js';
export const TABLES = Object.freeze({ companies: 'companies', projects: 'projects', clusters: 'clusters', units: 'units', customers: 'users', assignments: 'property_assignments', payments: 'payment_history' });
export function createSyncRepository(db) {
  function table(entity) { assertEntity(entity); return TABLES[entity]; }
  return {
    async listEvents({ afterSeq, limit }) {
      return db`SELECT seq, entity, entity_id, op, row_version, payload, created_at FROM public.sync_outbox
        WHERE seq > ${afterSeq} AND created_at < now() - interval '5 seconds' ORDER BY seq LIMIT ${limit}`;
    },
    // v2: one repeatable-read snapshot supplies both the rows and the watermark.
    // Every txid below xmin belongs to a finished transaction, so nothing can commit behind the cursor later.
    async listEventsV2({ afterTxid, afterSeq, limit }) {
      return db.begin('isolation level repeatable read read only', async tx => {
        const [{ xmin }] = await tx`SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS xmin`;
        const rows = await tx`SELECT seq, txid::text AS txid, entity, entity_id, op, row_version, payload, created_at
          FROM public.sync_outbox
          WHERE (txid, seq) > (${String(afterTxid)}::text::xid8, ${afterSeq}::bigint) AND txid < ${xmin}::text::xid8
          ORDER BY txid, seq LIMIT ${limit}`;
        const [{ held }] = await tx`SELECT EXISTS (SELECT 1 FROM public.sync_outbox
          WHERE txid >= ${xmin}::text::xid8 AND (txid, seq) > (${String(afterTxid)}::text::xid8, ${afterSeq}::bigint)) AS held`;
        return { rows, xmin, held };
      });
    },
    async startCursorV2() {
      const [{ xmin }] = await db`SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS xmin`;
      return { xmin };
    },
    async getSnapshot({ entity, pageAfterId, limit }) {
      const name = table(entity);
      return db.begin('isolation level repeatable read read only', async tx => {
        const [{ max_seq }] = await tx`SELECT coalesce(max(seq), 0) AS max_seq FROM public.sync_outbox`;
        const rows = await tx`SELECT public.sync_business_payload(${entity}, to_jsonb(t)) AS payload,
          sync_version AS row_version FROM ${tx('public.' + name)} t
          WHERE (${entity} <> 'customers' OR to_jsonb(t)->>'role' = 'customer')
          AND (${pageAfterId}::text IS NULL OR id::text COLLATE "C" > ${pageAfterId}::text COLLATE "C")
          ORDER BY id::text COLLATE "C" LIMIT ${limit}`;
        return { rows: rows.map(r => ({ ...r.payload, row_version: r.row_version })), max_seq };
      });
    },
    async getChecksum({ entity }) {
      const name = table(entity);
      const [result] = await db`SELECT count(*)::int AS count,
        coalesce(md5(string_agg(id::text || ':' || sync_version::text, ',' ORDER BY id::text COLLATE "C")), md5('')) AS hash
        FROM ${db('public.' + name)} t WHERE ${entity} <> 'customers' OR to_jsonb(t)->>'role' = 'customer'`;
      return result;
    },
  };
}
