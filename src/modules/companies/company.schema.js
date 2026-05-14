// src/modules/companies/company.schema.js
import { z } from 'zod';

export const createCompanySchema = {
  body: z.object({
    name: z.string().min(3).max(255).optional(),
    nama_pt: z.string().min(3).max(255).optional(),
    kode_pt: z.string().min(2).max(50).optional(),
    alamat: z.string().optional(),
    logo_url: z.string().optional(),
  }).refine((data) => data.name || data.nama_pt, {
    message: "Nama company wajib diisi",
    path: ["nama_pt"],
  })
};

export const updateCompanySchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  }),
  body: z.object({
    name: z.string().min(3).max(255).optional(),
    nama_pt: z.string().min(3).max(255).optional(),
    kode_pt: z.string().min(2).max(50).optional(),
    alamat: z.string().optional(),
    logo_url: z.string().optional(),
  })
};

export const companyIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  })
};
