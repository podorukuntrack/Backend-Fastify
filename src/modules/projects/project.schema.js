import { z } from 'zod';

export const createProjectSchema = {
  body: z.object({
    nama_proyek: z.string().min(3, "Nama project minimal 3 karakter").max(255),
    lokasi: z.string().optional(),
    deskripsi: z.string().optional(),
    status: z.enum(['active', 'completed', 'on_hold']).default('active')
  })
};

export const updateProjectSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  }),
  body: z.object({
    nama_proyek: z.string().min(3).max(255).optional(),
    lokasi: z.string().optional(),
    deskripsi: z.string().optional(),
    status: z.enum(['active', 'completed', 'on_hold']).optional(),
  })
};

export const projectIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  })
};