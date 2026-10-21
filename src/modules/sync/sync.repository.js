import { assertEntity, BUSINESS_FIELDS } from './sync.config.js';
export const TABLES = Object.freeze({ companies: 'companies', projects: 'projects', clusters: 'clusters', units: 'units', customers: 'users', assignments: 'property_assignments', payments: 'payment_history' });
// Connection poolers (PgBouncer/Sumobase 6432/6433) ignore startup parameters, so the
// read-only guard and timeouts are set inside every transaction instead.
export function readOnly(db, fn, isolation = 'repeatable read') {
  return db.begin(`isolation level ${isolation} read only`, async tx => {
    await tx`SET LOCAL statement_timeout = '15s'`;
    await tx`SET LOCAL idle_in_transaction_session_timeout = '15s'`;
    return fn(tx);
  });
}
export function createSyncRepository(db) {
  function table(entity) { assertEntity(entity); return TABLES[entity]; }
  return {
    async listEvents({ afterSeq, limit }) {
      return readOnly(db, tx => tx`SELECT seq, entity, entity_id, op, row_version, payload, created_at FROM public.sync_outbox
        WHERE seq > ${afterSeq} AND created_at < now() - interval '5 seconds' ORDER BY seq LIMIT ${limit}`, 'read committed');
    },
    // v2: one repeatable-read snapshot supplies both the rows and the watermark.
    // Every txid below xmin belongs to a finished transaction, so nothing can commit behind the cursor later.
    async listEventsV2({ afterTxid, afterSeq, limit }) {
      return readOnly(db, async tx => {
        const [feed]=await tx`SELECT source_id,pruned_txid::text,pruned_seq::text FROM public.sync_feed WHERE singleton`;
        if (feed && (BigInt(afterTxid)<BigInt(feed.pruned_txid) || (BigInt(afterTxid)===BigInt(feed.pruned_txid) && BigInt(afterSeq)<BigInt(feed.pruned_seq)))) {
          throw Object.assign(new Error('Cursor expired: full resnapshot required'),{statusCode:410});
        }
        const [{ xmin }] = await tx`SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS xmin`;
        const rows = await tx`SELECT seq, txid::text AS txid, entity, entity_id, op, row_version, payload, created_at
          FROM public.sync_outbox
          WHERE (txid, seq) > (${String(afterTxid)}::text::xid8, ${afterSeq}::bigint) AND txid < ${xmin}::text::xid8
          ORDER BY txid, seq LIMIT ${limit}`;
        const [{ held }] = await tx`SELECT EXISTS (SELECT 1 FROM public.sync_outbox
          WHERE txid >= ${xmin}::text::xid8 AND (txid, seq) > (${String(afterTxid)}::text::xid8, ${afterSeq}::bigint)) AS held`;
        return { rows, xmin, held, sourceId:feed?.source_id };
      });
    },
    async startCursorV2() {
      const [{ xmin,source_id }] = await readOnly(db, tx => tx`SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS xmin,source_id FROM public.sync_feed WHERE singleton`, 'read committed');
      return { xmin,sourceId:source_id };
    },
    async getSnapshot({ entity, pageAfterId, limit }) {
      const name = table(entity);
      return readOnly(db, async tx => {
        const [{ max_seq }] = await tx`SELECT coalesce(max(seq), 0) AS max_seq FROM public.sync_outbox`;
        const pairs=BUSINESS_FIELDS[entity].flatMap(k=>[tx`${k}::text`,tx(`t.${k}`)]);
        const fields=pairs.map(x=>tx`${x}`);
        const object=fields.reduce((out,x,i)=>i?tx`${out},${x}`:x);
        const where=entity==='customers'?tx`role='customer'`:tx`true`;
        const rows = await tx`SELECT public.sync_business_payload(${entity}, jsonb_build_object(${object})) AS payload,
          sync_version AS row_version FROM ${tx('public.' + name)} t
          WHERE ${where}
          AND (${pageAfterId}::text IS NULL OR id::text COLLATE "C" > ${pageAfterId}::text COLLATE "C")
          ORDER BY id::text COLLATE "C" LIMIT ${limit}`;
        return { rows: rows.map(r => ({ ...r.payload, row_version: r.row_version })), max_seq };
      });
    },
    async getChecksum({ entity }) {
      const name = table(entity);
      return readOnly(db, async tx => {
        const where=entity==='customers'?tx`role='customer'`:tx`true`;
        const [result] = await tx`SELECT count(*)::int AS count,
          coalesce(md5(string_agg(id::text || ':' || sync_version::text, ',' ORDER BY id::text COLLATE "C")), md5('')) AS hash
          FROM ${tx('public.' + name)} t WHERE ${where}`;
        return result;
      }, 'read committed');
    },
    async getChecksumV2({ entity }) {
      const name = table(entity);
      return readOnly(db, async tx => {
        const where=entity==='customers'?tx`role='customer'`:tx`true`;
        const [{ watermark }] = await tx`SELECT pg_snapshot_xmin(pg_current_snapshot())::text AS watermark`;
        const [result] = await tx`SELECT count(*)::int AS count,
          coalesce(md5(string_agg(id::text || ':' || sync_version::text, ',' ORDER BY id::text COLLATE "C")), md5('')) AS hash,
          public.sync_content_hash(${entity}) AS content_hash
          FROM ${tx('public.' + name)} t WHERE ${where}`;
        return { ...result, watermark };
      });
    },
  };
}
