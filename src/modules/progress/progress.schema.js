import { z } from 'zod';

export const createProgressSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    unitId: z.string().uuid("Format Unit ID tidak valid"),
    percentage: z.number().min(0).max(100, "Persentase maksimal 100"),
    notes: z.string().optional()
  })
};

export const updateProgressSchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    percentage: z.number().min(0).max(100).optional(),
    notes: z.string().optional()
  })
};

export const paramIdSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};