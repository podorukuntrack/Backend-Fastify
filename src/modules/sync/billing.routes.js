import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bearerTokenMatches,parseLimit,parsePageAfterId } from './sync.service.js';
import { readOnly } from './sync.repository.js';

const uuid = z.uuid();
const amount = z.union([z.string(), z.number()]).transform(String).refine(v => /^\d{1,16}(\.\d{1,2})?$/.test(v), 'Invalid amount');
const version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const schedule = z.object({
  siJadwalId: uuid, trackAssignmentId: uuid, noUrut: z.number().int().positive().max(32767).optional(),
  tanggal: z.iso.date().optional(), jumlah: amount.optional(), keterangan: z.string().max(100).nullable().optional(),
  jenis: z.enum(['booking_fee','uang_muka','angsuran','pencairan_kpr']).default('uang_muka'),
  aktif: z.boolean(), realisasi: amount.default('0'), versi: version,
  nilaiKontrak:amount.optional(),
}).strict().refine(v => !v.aktif || (v.noUrut && v.tanggal && v.jumlah && Number(v.jumlah) > 0), 'Active bill requires amount, date and order');
const result = z.object({
  trackPaymentId: uuid, siJadwalId: uuid.nullable(), status: z.enum(['menunggu','ditolak','dijurnal','dikoreksi','perlu_ditinjau']),
  alasan: z.string().max(5000).nullable().optional(), jurnal: z.string().max(60).nullable().optional(), versi: version,
}).strict();
const lock = z.object({trackPaymentId:uuid,jurnal:z.string().max(60),terkunci:z.literal(true),versi:version}).strict();
const fail = (message, statusCode = 409) => Object.assign(new Error(message), {statusCode});
const hash=b=>createHash('sha256').update(JSON.stringify(b)).digest('hex');

// Separate authenticated writer, injected explicitly; staging read-only API stays read-only.
export default async function billingRoutes(app, { db, token, allowedIps = [] }) {
  if (!db || !token || token.length < 32 || !allowedIps.length) throw new Error('Explicit billing writer, token and IP allowlist required');
  app.addHook('onRequest', async (request, reply) => {
    if (!allowedIps.includes(request.ip) || !bearerTokenMatches(request, token)) return reply.code(401).send({message:'Unauthorized'});
  });
  app.get('/billing-snapshot/:entity',async request=>{
    const after=parsePageAfterId(request.query.after_id);
    const limit=parseLimit(request.query.limit);
    let rows;
    // Read-only and timeouts per transaction: poolers ignore connection startup parameters.
    rows=await readOnly(db,tx=>{
    if(request.params.entity==='schedules') return tx`SELECT s.id,s.assignment_id,s.no_urut,to_char(s.tanggal,'YYYY-MM-DD') AS tanggal,
      s.jumlah::text,s.jenis,s.keterangan,s.aktif,s.realisasi::text,p.si_contract_total::text AS nilai_kontrak
      FROM public.si_schedules s JOIN public.property_assignments p ON p.id=s.assignment_id
      WHERE (${after}::text IS NULL OR s.id::text COLLATE "C">${after}::text COLLATE "C") ORDER BY s.id::text COLLATE "C" LIMIT ${limit+1}`;
    if(request.params.entity==='results') return tx`SELECT id,si_jadwal_id,status_si,alasan_si,jurnal_si FROM public.payment_history
      WHERE si_jadwal_id IS NOT NULL AND (${after}::text IS NULL OR id::text COLLATE "C">${after}::text COLLATE "C")
      ORDER BY id::text COLLATE "C" LIMIT ${limit+1}`;
    throw fail('Unknown billing entity',404);
    },'read committed');
    return {rows:rows.slice(0,limit),has_more:rows.length>limit};
  });
  async function receive(request, schema, apply) {
    const parsed = schema.safeParse(request.body);
    const key = uuid.safeParse(request.headers['idempotency-key']);
    if (!parsed.success || !key.success || request.params.id !== (parsed.data.trackPaymentId ?? parsed.data.siJadwalId)) throw fail('Invalid billing payload or Idempotency-Key',400);
    const body = parsed.data;
    const fingerprint = createHash('sha256').update(JSON.stringify([request.routeOptions.url, request.params.id, body])).digest('hex');
    return db.begin(async tx => {
      await tx`SET LOCAL statement_timeout = '15s'`;
      await tx`SET LOCAL lock_timeout = '5s'`;
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${key.data},0))`;
      const [previous] = await tx`SELECT fingerprint,response FROM public.si_sync_inbox WHERE id=${key.data}`;
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw fail('Idempotency-Key reused with another payload');
        return previous.response;
      }
      const response = await apply(tx,body);
      await tx`INSERT INTO public.si_sync_inbox(id,fingerprint,response) VALUES(${key.data},${fingerprint},${tx.json(response)})`;
      return response;
    });
  }
  app.put('/schedules/:id', async request => receive(request,schedule,async (tx,b) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${b.siJadwalId},1))`;
    const [old] = await tx`SELECT * FROM public.si_schedules WHERE id=${b.siJadwalId} FOR UPDATE`;
    if (old && old.assignment_id !== b.trackAssignmentId) throw fail('Bill assignment cannot change');
    if (old && Number(old.versi)===b.versi && old.payload_hash && old.payload_hash!==hash(b)) throw fail('Same bill version has conflicting content');
    if (old && Number(old.versi) >= b.versi) return {data:{track_id:old.id,applied:false,reason:'stale_version'}};
    if (!old && !b.aktif && !b.jumlah) throw fail('Initial bill snapshot required');
    const [assignment] = await tx`SELECT id FROM public.property_assignments WHERE id=${b.trackAssignmentId}`;
    if (!assignment) throw fail('Assignment not found',404);
    if(b.nilaiKontrak) await tx`UPDATE public.property_assignments SET si_contract_total=${b.nilaiKontrak},si_contract_version=${b.versi},
      total_dibayar=(SELECT coalesce(sum(jumlah_bayar),0) FROM public.payment_history WHERE assignment_id=${b.trackAssignmentId}
        AND ((si_jadwal_id IS NULL AND NOT coalesce(is_auto_inject,false)) OR (si_jadwal_id IS NOT NULL AND status_si='dijurnal')))
      WHERE id=${b.trackAssignmentId} AND si_contract_version<${b.versi}`;
    await tx`INSERT INTO public.si_schedules(id,assignment_id,no_urut,tanggal,jumlah,jenis,keterangan,aktif,realisasi,versi,payload_hash)
      VALUES(${b.siJadwalId},${b.trackAssignmentId},${b.noUrut ?? old.no_urut},${b.tanggal ?? old.tanggal},${b.jumlah ?? old.jumlah},${b.jenis},${b.keterangan ?? null},${b.aktif},${b.realisasi},${b.versi},${hash(b)})
      ON CONFLICT(id) DO UPDATE SET no_urut=excluded.no_urut,tanggal=excluded.tanggal,jumlah=excluded.jumlah,
        jenis=excluded.jenis,keterangan=excluded.keterangan,aktif=excluded.aktif,realisasi=excluded.realisasi,versi=excluded.versi,payload_hash=excluded.payload_hash,updated_at=now()`;
    return {data:{track_id:b.siJadwalId,applied:true}};
  }));
  app.put('/payment-results/:id', async request => receive(request,result,async (tx,b) => {
    const [p] = await tx`SELECT * FROM public.payment_history WHERE id=${b.trackPaymentId} FOR UPDATE`;
    if (!p) throw fail('Payment not found',404);
    if (p.si_jadwal_id !== b.siJadwalId) throw fail('Payment bill mismatch');
    if(Number(p.versi_si)===b.versi && p.si_result_hash && p.si_result_hash!==hash(b)) throw fail('Same payment version has conflicting content');
    if (Number(p.versi_si) >= b.versi) return {data:{applied:false,reason:'stale_version'}};
    await tx`SELECT set_config('prtrack.finance_writer','result',true)`;
    await tx`UPDATE public.payment_history SET status_si=${b.status},alasan_si=${b.alasan ?? null},jurnal_si=${b.jurnal ?? null},
      dikunci_si=${['dijurnal','perlu_ditinjau'].includes(b.status)},versi_si=${b.versi},si_result_hash=${hash(b)} WHERE id=${b.trackPaymentId}`;
    return {data:{applied:true}};
  }));
  app.put('/payment-locks/:id', async request => receive(request,lock,async (tx,b) => {
    const [p] = await tx`SELECT * FROM public.payment_history WHERE id=${b.trackPaymentId} FOR UPDATE`;
    if (!p) throw fail('Payment not found',404);
    if (Number(p.versi_si) >= b.versi) return {data:{applied:false,reason:'stale_version'}};
    await tx`SELECT set_config('prtrack.finance_writer','result',true)`;
    await tx`UPDATE public.payment_history SET dikunci_si=true,jurnal_si=${b.jurnal},versi_si=${b.versi} WHERE id=${b.trackPaymentId}`;
    return {data:{applied:true}};
  }));
}
