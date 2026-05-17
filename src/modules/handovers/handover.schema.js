// src/modules/handovers/handover.schema.js
import { z } from 'zod';

export const createHandoverSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    unitId: z.string().uuid(),
    scheduledDate: z.string().datetime(),
    proposedDate: z.string().datetime().optional().nullable(),
    status: z.enum(['menunggu_respon_customer', 'menunggu_konfirmasi_admin', 'dijadwalkan', 'selesai', 'gagal', 'delayed', 'completed', 'scheduled']).default('menunggu_respon_customer'),
    notes: z.string().optional().nullable()
  })
};

export const updateHandoverSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    scheduledDate: z.string().datetime().optional(),
    proposedDate: z.string().datetime().optional().nullable(),
    actualDate: z.string().datetime().optional().nullable(),
    status: z.enum(['menunggu_respon_customer', 'menunggu_konfirmasi_admin', 'dijadwalkan', 'selesai', 'gagal', 'delayed', 'completed', 'scheduled']).optional(),
    notes: z.string().optional().nullable()
  })
};

export const defectSchema = {
  params: z.object({ id: z.string().uuid("Handover ID tidak valid") }),
  body: z.object({
    description: z.string().min(5),
    imageUrl: z.string().url().optional(),
    status: z.enum(['reported', 'fixing', 'resolved']).default('reported')
  })
};

export const respondHandoverSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['dijadwalkan', 'menunggu_konfirmasi_admin']),
    proposedDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional().nullable()
  })
};

export const confirmHandoverSchema = {
  params: z.object({ id: z.string().uuid() })
};