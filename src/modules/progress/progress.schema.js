import { z } from 'zod';

export const createProgressSchema = {
  body: z.object({
    unitId: z.string().uuid("Format Unit ID tidak valid").optional(),
    unit_id: z.string().uuid("Format Unit ID tidak valid").optional(),
    tahap: z.string().min(1).optional(),
    progress_percentage: z.coerce.number().min(0).max(100, "Persentase maksimal 100").optional(),
    percentage: z.coerce.number().min(0).max(100, "Persentase maksimal 100").optional(),
    tanggal_update: z.string().optional(),
    catatan: z.string().optional(),
    notes: z.string().optional()
  }).refine((data) => data.unitId || data.unit_id, {
    message: "Unit ID wajib diisi",
    path: ["unit_id"],
  })
};

export const updateProgressSchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    unitId: z.string().uuid().optional(),
    unit_id: z.string().uuid().optional(),
    tahap: z.string().min(1).optional(),
    progress_percentage: z.coerce.number().min(0).max(100).optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
    tanggal_update: z.string().optional(),
    catatan: z.string().optional(),
    notes: z.string().optional()
  })
};

export const paramIdSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};
