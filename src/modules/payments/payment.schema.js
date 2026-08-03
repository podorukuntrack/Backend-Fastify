import { z } from 'zod';

export const unitIdParamSchema = { params: z.object({ id: z.string().uuid() }) };
