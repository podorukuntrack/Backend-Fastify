import { z } from 'zod';

export const createAssignmentSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    projectId: z.string().uuid("Format Project ID tidak valid"),
    contractorName: z.string().min(3, "Nama kontraktor minimal 3 karakter"),
    taskDescription: z.string().min(5, "Deskripsi tugas wajib diisi"),
    status: z.enum(['pending', 'on_progress', 'completed']).default('pending'),
    startDate: z.string().datetime().optional(), // Format ISO-8601 string
    endDate: z.string().datetime().optional()
  })
};

export const updateAssignmentSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    contractorName: z.string().min(3).optional(),
    taskDescription: z.string().min(5).optional(),
    status: z.enum(['pending', 'on_progress', 'completed']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
};

export const assignmentIdParamSchema = {
  params: z.object({ id: z.string().uuid() })
};