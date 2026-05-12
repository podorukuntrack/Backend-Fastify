// src/modules/timelines/timeline.repository.js
import { db } from '../../config/database.js';
import { timelines } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findTimelines = async (userContext) => {
  const scope = getTenantScope(timelines, userContext);
  return await db.select().from(timelines).where(scope).orderBy(timelines.startDate);
};

export const insertTimeline = async (data) => {
  data.startDate = new Date(data.startDate);
  data.endDate = new Date(data.endDate);
  const result = await db.insert(timelines).values(data).returning();
  return result[0];
};

export const updateTimeline = async (id, data, userContext) => {
  const scope = getTenantScope(timelines, userContext);
  const condition = scope ? and(eq(timelines.id, id), scope) : eq(timelines.id, id);
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  data.updatedAt = new Date();
  
  const result = await db.update(timelines).set(data).where(condition).returning();
  return result[0];
};

export const deleteTimeline = async (id, userContext) => {
  const scope = getTenantScope(timelines, userContext);
  const condition = scope ? and(eq(timelines.id, id), scope) : eq(timelines.id, id);
  const result = await db.delete(timelines).where(condition).returning();
  return result[0];
};