import { z } from 'zod';

export const createClusterSchema = {
  body: z.object({
    project_id: z.string().uuid('Format Project ID tidak valid'),
    nama_cluster: z.string().min(3, 'Nama cluster minimal 3 karakter').max(255),
    jumlah_unit: z.coerce.number().int().min(0).default(0).optional(),
  }),
};

export const updateClusterSchema = {
  params: z.object({
    id: z.string().uuid('Format ID tidak valid'),
  }),
  body: z.object({
    project_id: z.string().uuid('Format Project ID tidak valid').optional(),
    nama_cluster: z.string().min(3).max(255).optional(),
    jumlah_unit: z.coerce.number().int().min(0).optional(),
  }),
};

export const clusterIdParamSchema = {
  params: z.object({
    id: z.string().uuid('Format ID tidak valid'),
  }),
};
