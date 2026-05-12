// src/modules/users/user.schema.js
import { z } from 'zod';
import { roleEnum } from '../../shared/schemas/schema.js';

export const queryUserSchema = {
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
  })
};

export const createUserSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(), // Nullable untuk super_admin
    name: z.string().min(3).max(255),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(roleEnum.enumValues).default('customer')
  })
};

export const updateUserSchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(3).max(255).optional(),
    role: z.enum(roleEnum.enumValues).optional(),
    companyId: z.string().uuid().optional(),
    // Password di-update melalui endpoint terpisah idealnya, tapi kita skip di sini untuk simplifikasi
  })
};

export const userIdParamSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};