import { z } from 'zod';

export const createProjectSchema = {
  body: z.object({
    companyId: z.string().uuid("Format Company ID tidak valid").optional(), // Nullable jika yang buat admin
    name: z.string().min(3, "Nama project minimal 3 karakter").max(255),
    location: z.string().optional(),
    status: z.enum(['active', 'completed']).default('active')
  })
};

export const updateProjectSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  }),
  body: z.object({
    name: z.string().min(3).max(255).optional(),
    location: z.string().optional(),
    status: z.enum(['active', 'completed']).optional(),
    companyId: z.string().uuid().optional(),
  })
};

export const projectIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  })
};