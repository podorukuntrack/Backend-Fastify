// src/modules/companies/company.schema.js
import { z } from 'zod';

export const createCompanySchema = {
  body: z.object({
    name: z.string().min(3, "Nama company minimal 3 karakter").max(255),
  })
};

export const updateCompanySchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  }),
  body: z.object({
    name: z.string().min(3).max(255).optional(),
  })
};

export const companyIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format ID tidak valid")
  })
};