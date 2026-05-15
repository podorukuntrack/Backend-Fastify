// src/modules/timelines/timeline.schema.js
import { z } from 'zod';

export const createTimelineSchema = {
  body: z.object({
    companyId: z.string().uuid().optional(),
    projectId: z.string().uuid(),
    unitId: z.string().uuid(),
    taskName: z.string().min(3),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    status: z.enum(['planned', 'on_progress', 'completed', 'delayed']).default('planned')
  })
};

export const updateTimelineSchema = {
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    taskName: z.string().min(3).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(['planned', 'on_progress', 'completed', 'delayed']).optional()
  })
};

export const paramIdSchema = { params: z.object({ id: z.string().uuid() }) };