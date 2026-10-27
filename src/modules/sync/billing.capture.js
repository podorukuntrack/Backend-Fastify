import { createHash } from 'node:crypto';
const fail=(message,statusCode=409)=>Object.assign(new Error(message),{statusCode});
const cents=v=>{
  const m=/^(\d+)(?:\.(\d{1,2}))?$/.exec(String(v));
  if(!m) throw fail('Nominal tidak valid',400);
  return BigInt(m[1])*100n+BigInt((m[2]??'').padEnd(2,'0'));
};
export function createBillingCapture(db) {
  return async (assignmentId,data,userId)=>{
    if(!data.request_id || !data.si_jadwal_id) throw fail('request_id dan si_jadwal_id wajib diisi',400);
    const fingerprint=createHash('sha256').update(JSON.stringify([assignmentId,data.si_jadwal_id,data.tanggal_bayar,data.rekening_tujuan??null,data.bukti_pembayaran,data.catatan??null,data.jumlah_bayar??null])).digest('hex');
    return db.begin(async tx=>{
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${data.request_id},2))`;
      const [previous]=await tx`SELECT * FROM public.payment_history WHERE id=${data.request_id}`;
      if(previous) {
        if(previous.si_request_hash!==fingerprint || previous.created_by!==userId) throw fail('request_id sudah digunakan untuk pengajuan lain');
        return previous;
      }
      const [bill]=await tx`SELECT *, (jumlah-realisasi)::text AS sisa FROM public.si_schedules WHERE id=${data.si_jadwal_id} AND assignment_id=${assignmentId} FOR UPDATE`;
      if(!bill || !bill.aktif || cents(bill.sisa)<=0n) throw fail('Tagihan tidak aktif, lunas, atau bukan milik penjualan');
      if(data.jumlah_bayar!==undefined && cents(data.jumlah_bayar)!==cents(bill.sisa)) throw fail('Nominal ditentukan tagihan SI',400);
      const [row]=await tx`INSERT INTO public.payment_history(id,assignment_id,si_jadwal_id,jumlah_bayar,tanggal_bayar,catatan,bukti_pembayaran,created_by,jenis, rekening_tujuan,si_request_hash)
        VALUES(${data.request_id},${assignmentId},${bill.id},${bill.sisa},${data.tanggal_bayar},${data.catatan??null},${Array.isArray(data.bukti_pembayaran)?JSON.stringify(data.bukti_pembayaran):data.bukti_pembayaran},${userId},${bill.jenis},${data.rekening_tujuan??null},${fingerprint}) RETURNING *`;
      return row;
    });
  };
}
