import { z } from 'zod';

export const createPaymentSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    unitId: z.string().uuid("Format Unit ID tidak valid"),
    amount: z.number().positive("Jumlah pembayaran harus lebih dari 0"),
    paymentDate: z.string().datetime(),
    method: z.enum(['transfer', 'cash', 'kpr']),
    status: z.enum(['pending', 'verified', 'failed']).default('pending'),
    receiptUrl: z.string().url().optional().nullable()
  })
};

export const unitIdParamSchema = { params: z.object({ id: z.string().uuid() }) };