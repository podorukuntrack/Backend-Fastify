import { z } from 'zod';

export const createUnitSchema = {
  body: z.object({
    companyId: z.string().uuid("Format Company ID tidak valid").optional(), // Nullable jika yang buat admin
    clusterId: z.string().uuid("Format Cluster ID tidak valid"),
    userId: z.string().uuid("Format User ID tidak valid").optional().nullable(), // Nullable jika belum terjual
    block: z.string().min(1, "Blok tidak boleh kosong").max(50),
    number: z.string().min(1, "Nomor unit tidak boleh kosong").max(50),
    price: z.number().positive("Harga harus lebih dari 0").optional(),
    status: z.enum(['available', 'reserved', 'sold']).default('available')
  })
};

export const updateUnitSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  }),
  body: z.object({
    companyId: z.string().uuid().optional(),
    clusterId: z.string().uuid().optional(),
    userId: z.string().uuid().optional().nullable(),
    block: z.string().min(1).max(50).optional(),
    number: z.string().min(1).max(50).optional(),
    price: z.number().positive().optional(),
    status: z.enum(['available', 'reserved', 'sold']).optional()
  })
};

export const unitIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  })
};