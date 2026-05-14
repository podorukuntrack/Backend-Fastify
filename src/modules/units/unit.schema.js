import { z } from 'zod';

const statusPembangunanEnum = z.enum([
  'belum_mulai',
  'dalam_pembangunan',
  'selesai',
]);

export const createUnitSchema = {
  body: z.object({
    clusterId: z.string().uuid("Format Cluster ID tidak valid"),
    cluster_id: z.string().uuid("Format Cluster ID tidak valid").optional(),
    nomorUnit: z.string().min(1, "Nomor unit tidak boleh kosong").max(50),
    nomor_unit: z.string().min(1, "Nomor unit tidak boleh kosong").max(50).optional(),
    tipeRumah: z.string().min(1, "Tipe rumah tidak boleh kosong").max(50),
    tipe_rumah: z.string().min(1, "Tipe rumah tidak boleh kosong").max(50).optional(),
    luasTanah: z.number().positive("Luas tanah harus lebih dari 0").nullable().optional(),
    luas_tanah: z.number().positive("Luas tanah harus lebih dari 0").nullable().optional(),
    luasBangunan: z.number().positive("Luas bangunan harus lebih dari 0").nullable().optional(),
    luas_bangunan: z.number().positive("Luas bangunan harus lebih dari 0").nullable().optional(),
    statusPembangunan: statusPembangunanEnum.default('belum_mulai').optional(),
    status_pembangunan: statusPembangunanEnum.optional(),
    progressPercentage: z.number().int().min(0).max(100).default(0).optional(),
    progress_percentage: z.number().int().min(0).max(100).optional(),
  }),
};

export const updateUnitSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid"),
  }),
  body: z.object({
    clusterId: z.string().uuid().optional(),
    cluster_id: z.string().uuid().optional(),
    nomorUnit: z.string().min(1).max(50).optional(),
    nomor_unit: z.string().min(1).max(50).optional(),
    tipeRumah: z.string().min(1).max(50).optional(),
    tipe_rumah: z.string().min(1).max(50).optional(),
    luasTanah: z.number().positive().nullable().optional(),
    luas_tanah: z.number().positive().nullable().optional(),
    luasBangunan: z.number().positive().nullable().optional(),
    luas_bangunan: z.number().positive().nullable().optional(),
    statusPembangunan: statusPembangunanEnum.optional(),
    status_pembangunan: statusPembangunanEnum.optional(),
    progressPercentage: z.number().int().min(0).max(100).optional(),
    progress_percentage: z.number().int().min(0).max(100).optional(),
  }),
};

export const unitIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid"),
  }),
};

export const getUnitsQuerySchema = {
  querystring: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    clusterId: z.string().uuid().optional(),
    cluster_id: z.string().uuid().optional(),
    statusPembangunan: statusPembangunanEnum.optional(),
    status_pembangunan: statusPembangunanEnum.optional(),
    search: z.string().optional(),
  }),
};

export const bulkCreateUnitsSchema = {
  body: z.object({
    units: z.array(
      z.object({
        clusterId: z.string().uuid("Format Cluster ID tidak valid"),
        nomorUnit: z.string().min(1, "Nomor unit tidak boleh kosong").max(50),
        tipeRumah: z.string().min(1, "Tipe rumah tidak boleh kosong").max(50),
        luasTanah: z.number().positive("Luas tanah harus lebih dari 0").nullable().optional(),
        luasBangunan: z.number().positive("Luas bangunan harus lebih dari 0").nullable().optional(),
        statusPembangunan: statusPembangunanEnum.default('planned').optional(),
        progressPercentage: z.number().int().min(0).max(100).default(0).optional(),
      }).strict()
    ).min(1, "Minimal 1 unit harus dibuat"),
  }),
};
