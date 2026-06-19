import { z } from 'zod';

export const createRetentionSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    unitId: z.string().uuid("Format Unit ID tidak valid"),
    dueDate: z.string().datetime("Format tanggal tidak valid (gunakan ISO-8601)"),
    status: z.enum(['active', 'released', 'claimed']).default('active'),
    notes: z.string().optional(),
    linkFoto360: z.string().optional().nullable().or(z.literal('')),
    photoBeforeUrl: z.string().optional().nullable().or(z.literal('')),
    photoAfterUrl: z.string().optional().nullable().or(z.literal(''))
  })
};

export const updateRetentionSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    dueDate: z.string().datetime().optional(),
    status: z.enum(['active', 'released', 'claimed']).optional(),
    notes: z.string().optional(),
    linkFoto360: z.string().optional().nullable().or(z.literal('')),
    photoBeforeUrl: z.string().optional().nullable().or(z.literal('')),
    photoAfterUrl: z.string().optional().nullable().or(z.literal(''))
  })
};

export const retentionIdParamSchema = {
  params: z.object({ id: z.string().uuid("Format ID tidak valid") })
};