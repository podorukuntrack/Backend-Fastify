// src/modules/handovers/handover.schema.js
import { z } from 'zod';

export const createHandoverSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    unitId: z.string().uuid(),
    scheduledDate: z.string().datetime(),
    status: z.enum(['scheduled', 'completed', 'delayed']).default('scheduled'),
    notes: z.string().optional()
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