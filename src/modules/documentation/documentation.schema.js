// src/modules/documentation/documentation.schema.js
import { z } from 'zod';

export const unitIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format Unit ID tidak valid")
  })
};

export const docIdParamSchema = {
  params: z.object({
    id: z.string().uuid("Format Document ID tidak valid")
  })
};