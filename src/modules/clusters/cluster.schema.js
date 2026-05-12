import { z } from 'zod';

export const createClusterSchema = {
  body: z.object({
    companyId: z.string().uuid("Format Company ID tidak valid").optional(), // Nullable jika yang buat admin
    projectId: z.string().uuid("Format Project ID tidak valid"),
    name: z.string().min(3, "Nama cluster minimal 3 karakter").max(255)
  })
};

export const updateClusterSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  }),
  body: z.object({
    companyId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    name: z.string().min(3).max(255).optional()
  })
};

export const clusterIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  })
};