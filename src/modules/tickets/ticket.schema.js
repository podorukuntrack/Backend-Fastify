import { z } from 'zod';

export const createTicketSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    subject: z.string().min(5, "Subjek tiket minimal 5 karakter").max(255),
    priority: z.enum(['low', 'normal', 'high']).default('normal')
  })
};

export const updateTicketSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'normal', 'high']).optional()
  })
};

export const messageSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    message: z.string().min(1, "Pesan tidak boleh kosong")
  })
};

export const ticketIdParamSchema = {
  params: z.object({ id: z.string().uuid() })
};