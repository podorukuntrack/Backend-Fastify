import { z } from 'zod';

// Status pembangunan yang diizinkan
const statusPembangunanEnum = [
  'planned',
  'pondasi',
  'struktur',
  'finishing',
  'ready',
  'handover',
];

// =========================
// CREATE
// =========================
export const createUnitSchema = {
  body: z.object({
    clusterId: z.string().uuid('Format Cluster ID tidak valid'),

    nomorUnit: z
      .string()
      .min(1, 'Nomor unit tidak boleh kosong')
      .max(50, 'Nomor unit maksimal 50 karakter'),

    tipeRumah: z
      .string()
      .min(1, 'Tipe rumah tidak boleh kosong')
      .max(50, 'Tipe rumah maksimal 50 karakter'),

    luasTanah: z
      .coerce.number()
      .nonnegative('Luas tanah tidak boleh negatif')
      .optional(),

    luasBangunan: z
      .coerce.number()
      .nonnegative('Luas bangunan tidak boleh negatif')
      .optional(),

    statusPembangunan: z
      .enum(statusPembangunanEnum)
      .default('planned'),

    progressPercentage: z
      .coerce.number()
      .int('Progress harus berupa bilangan bulat')
      .min(0, 'Progress minimal 0')
      .max(100, 'Progress maksimal 100')
      .default(0),
  }),
};

// =========================
// UPDATE
// =========================
export const updateUnitSchema = {
  params: z.object({
    id: z.string().uuid('Format ID tidak valid'),
  }),

  body: z.object({
    clusterId: z
      .string()
      .uuid('Format Cluster ID tidak valid')
      .optional(),

    nomorUnit: z
      .string()
      .min(1, 'Nomor unit tidak boleh kosong')
      .max(50, 'Nomor unit maksimal 50 karakter')
      .optional(),

    tipeRumah: z
      .string()
      .min(1, 'Tipe rumah tidak boleh kosong')
      .max(50, 'Tipe rumah maksimal 50 karakter')
      .optional(),

    luasTanah: z
      .coerce.number()
      .nonnegative('Luas tanah tidak boleh negatif')
      .optional(),

    luasBangunan: z
      .coerce.number()
      .nonnegative('Luas bangunan tidak boleh negatif')
      .optional(),

    statusPembangunan: z
      .enum(statusPembangunanEnum)
      .optional(),

    progressPercentage: z
      .coerce.number()
      .int('Progress harus berupa bilangan bulat')
      .min(0, 'Progress minimal 0')
      .max(100, 'Progress maksimal 100')
      .optional(),
  }),
};

// =========================
// PARAM ID
// =========================
export const unitIdParamSchema = {
  params: z.object({
    id: z.string().uuid('Format ID tidak valid'),
  }),
};