import { z } from 'zod';

export const createAssignmentSchema = {
  body: z.object({
    user_id: z.string().uuid("Format User ID tidak valid"),
    unit_id: z.string().uuid("Format Unit ID tidak valid"),
    project_id: z.string().uuid().optional(),
    cluster_id: z.string().uuid().optional(),
    tanggal_pembelian: z.string().optional(),
    status_kepemilikan: z.enum(['active', 'inactive', 'cancelled', 'completed']).default('active'),
    tipe_pembayaran: z.enum(['cash_lunas', 'cash_cicil', 'kredit_kpr']).default('cash_lunas'),
    harga_total: z.coerce.number().nonnegative().default(0),
    dp: z.coerce.number().nonnegative().nullable().optional(),
    jatuh_tempo_kpr: z.string().nullable().optional(),
    reminder_kpr_dates: z.array(z.string()).optional(),
    tenor_bulan: z.coerce.number().int().nonnegative().nullable().optional(),
    keterangan_kpr: z.string().nullable().optional(),
    bukti_pembayaran: z.string().url("Bukti pembayaran harus berupa URL valid").optional(),
  })
};

export const updateAssignmentSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    tanggal_pembelian: z.string().optional(),
    status_kepemilikan: z.enum(['active', 'inactive', 'cancelled', 'completed']).optional(),
    tipe_pembayaran: z.enum(['cash_lunas', 'cash_cicil', 'kredit_kpr']).optional(),
    harga_total: z.coerce.number().nonnegative().optional(),
    dp: z.coerce.number().nonnegative().nullable().optional(),
    jatuh_tempo_kpr: z.string().nullable().optional(),
    reminder_kpr_dates: z.array(z.string()).optional(),
    tenor_bulan: z.coerce.number().int().nonnegative().nullable().optional(),
    keterangan_kpr: z.string().nullable().optional(),
    bukti_pembayaran: z.string().url("Bukti pembayaran harus berupa URL valid").optional(),
  })
};

export const assignmentIdParamSchema = {
  params: z.object({ id: z.string().uuid() })
};

export const createPaymentSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    jumlah_bayar: z.coerce.number().positive(),
    tanggal_bayar: z.string().optional(),
    catatan: z.string().optional(),
    bukti_pembayaran: z.union([
      z.string().url("Bukti pembayaran harus berupa URL valid yang diunggah"),
      z.array(z.string().url("Setiap bukti pembayaran harus berupa URL valid"))
    ]).optional(),
  }),
};

export const updatePaymentSchema = {
  params: z.object({ id: z.string().uuid(), paymentId: z.string().uuid() }),
  body: z.object({
    jumlah_bayar: z.coerce.number().positive().optional(),
    tanggal_bayar: z.string().optional(),
    catatan: z.string().optional(),
    bukti_pembayaran: z.string().url("Bukti pembayaran harus berupa URL valid").optional(),
  }),
};
