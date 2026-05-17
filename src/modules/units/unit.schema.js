import { z } from 'zod';

const statusPembangunanEnum = z.enum([
  'belum_mulai',
  'dalam_pembangunan',
  'selesai',
]);

export const createUnitSchema = {
  body: z.object({
    clusterId: z.string().uuid("Format Cluster ID tidak valid").optional(),
    cluster_id: z.string().uuid("Format Cluster ID tidak valid").optional(),
    nomorUnit: z.string().min(1, "Nomor unit tidak boleh kosong").max(50).optional(),
    nomor_unit: z.string().min(1, "Nomor unit tidak boleh kosong").max(50).optional(),
    tipeRumah: z.string().min(1, "Tipe rumah tidak boleh kosong").max(50).optional(),
    tipe_rumah: z.string().min(1, "Tipe rumah tidak boleh kosong").max(50).optional(),
    luasTanah: z.number().min(0, "Luas tanah tidak boleh negatif").nullable().optional(),
    luas_tanah: z.number().min(0, "Luas tanah tidak boleh negatif").nullable().optional(),
    luasBangunan: z.number().min(0, "Luas bangunan tidak boleh negatif").nullable().optional(),
    luas_bangunan: z.number().min(0, "Luas bangunan tidak boleh negatif").nullable().optional(),
    statusPembangunan: statusPembangunanEnum.default('belum_mulai').optional(),
    status_pembangunan: statusPembangunanEnum.optional(),
    progressPercentage: z.number().int().min(0).max(100).default(0).optional(),
    progress_percentage: z.number().int().min(0).max(100).optional(),
  }).refine((data) => data.clusterId || data.cluster_id, {
    message: "Cluster ID wajib diisi",
    path: ["cluster_id"],
  }).refine((data) => data.nomorUnit || data.nomor_unit, {
    message: "Nomor unit wajib diisi",
    path: ["nomor_unit"],
  }).refine((data) => data.tipeRumah || data.tipe_rumah, {
    message: "Tipe rumah wajib diisi",
    path: ["tipe_rumah"],
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
    luasTanah: z.number().min(0).nullable().optional(),
    luas_tanah: z.number().min(0).nullable().optional(),
    luasBangunan: z.number().min(0).nullable().optional(),
    luas_bangunan: z.number().min(0).nullable().optional(),
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

const unitItemBulkSchema = z.object({
  clusterId: z.string().uuid("Format Cluster ID tidak valid").optional(),
  cluster_id: z.string().uuid("Format Cluster ID tidak valid").optional(),
  nomorUnit: z.string().min(1, "Nomor unit tidak boleh kosong").max(50).optional(),
  nomor_unit: z.string().min(1, "Nomor unit tidak boleh kosong").max(50).optional(),
  tipeRumah: z.string().min(1, "Tipe rumah tidak boleh kosong").max(50).optional(),
  tipe_rumah: z.string().min(1, "Tipe rumah tidak boleh kosong").max(50).optional(),
  luasTanah: z.number().min(0, "Luas tanah tidak boleh negatif").nullable().optional(),
  luas_tanah: z.number().min(0, "Luas tanah tidak boleh negatif").nullable().optional(),
  luasBangunan: z.number().min(0, "Luas bangunan tidak boleh negatif").nullable().optional(),
  luas_bangunan: z.number().min(0, "Luas bangunan tidak boleh negatif").nullable().optional(),
  statusPembangunan: statusPembangunanEnum.default('belum_mulai').optional(),
  status_pembangunan: statusPembangunanEnum.default('belum_mulai').optional(),
  progressPercentage: z.number().int().min(0).max(100).default(0).optional(),
  progress_percentage: z.number().int().min(0).max(100).default(0).optional(),
}).refine((data) => data.clusterId || data.cluster_id, {
  message: "Cluster ID wajib diisi",
  path: ["cluster_id"],
}).refine((data) => data.nomorUnit || data.nomor_unit, {
  message: "Nomor unit wajib diisi",
  path: ["nomor_unit"],
}).refine((data) => data.tipeRumah || data.tipe_rumah, {
  message: "Tipe rumah wajib diisi",
  path: ["tipe_rumah"],
});

const unitsArraySchema = z.array(unitItemBulkSchema).min(1, "Minimal 1 unit harus dibuat");

export const bulkCreateUnitsSchema = {
  body: z.union([
    z.object({
      units: unitsArraySchema,
    }),
    unitsArraySchema,
  ]),
};
