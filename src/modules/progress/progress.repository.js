import { db } from '../../config/database.js';
import { progress, units } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findAllProgress = async (userContext) => {
  const scope = getTenantScope(progress, userContext);
  return await db.select().from(progress).where(scope);
};

export const findProgressByUnitId = async (unitId, userContext) => {
  const scope = getTenantScope(progress, userContext);
  const condition = scope ? and(eq(progress.unitId, unitId), scope) : eq(progress.unitId, unitId);
  return await db.select().from(progress).where(condition).orderBy(progress.createdAt);
};

export const findProgressById = async (id, userContext) => {
  const scope = getTenantScope(progress, userContext);
  const condition = scope ? and(eq(progress.id, id), scope) : eq(progress.id, id);
  const result = await db.select().from(progress).where(condition).limit(1);
  return result[0];
};

export const insertProgress = async (data) => {
  const result = await db.insert(progress).values(data).returning();
  return result[0];
};

export const updateProgress = async (id, data, userContext) => {
  const scope = getTenantScope(progress, userContext);
  const condition = scope ? and(eq(progress.id, id), scope) : eq(progress.id, id);
  data.updatedAt = new Date();
  const result = await db.update(progress).set(data).where(condition).returning();
  return result[0];
};

export const deleteProgress = async (id, userContext) => {
  const scope = getTenantScope(progress, userContext);
  const condition = scope ? and(eq(progress.id, id), scope) : eq(progress.id, id);
  const result = await db.delete(progress).where(condition).returning();
  return result[0];
};