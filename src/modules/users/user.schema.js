// src/modules/users/user.schema.js
import { z } from 'zod';
import { roleEnum } from '../../shared/schemas/schema.js';

export const queryUserSchema = {
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
    search: z.string().optional(),
    role: z.enum(roleEnum.enumValues).optional(),
  })
};

export const createUserSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(), // Nullable untuk super_admin
    company_id: z.string().uuid().optional(),
    name: z.string().min(3).max(255).optional(),
    nama: z.string().min(3).max(255).optional(),
    email: z.string().email(),
    password: z.string().min(6),
    nomor_telepon: z.string().optional(),
    role: z.enum(roleEnum.enumValues).default('customer'),
    status: z.enum(['active', 'inactive']).default('active'),
  }).refine((data) => data.name || data.nama, {
    message: 'Nama wajib diisi',
    path: ['nama'],
  })
};

export const updateUserSchema = {
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(3).max(255).optional(),
    nama: z.string().min(3).max(255).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    nomor_telepon: z.string().optional(),
    role: z.enum(roleEnum.enumValues).optional(),
    companyId: z.string().uuid().optional(),
    company_id: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
};

export const userIdParamSchema = {
  params: z.object({
    id: z.string().uuid()
  })
};
