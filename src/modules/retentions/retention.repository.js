import { db } from '../../config/database.js';
import { retentions } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findRetentions = async (userContext) => {
  const scope = getTenantScope(retentions, userContext);
  return await db.select().from(retentions).where(scope).orderBy(retentions.dueDate);
};

export const findRetentionById = async (id, userContext) => {
  const scope = getTenantScope(retentions, userContext);
  const condition = scope ? and(eq(retentions.id, id), scope) : eq(retentions.id, id);
  const result = await db.select().from(retentions).where(condition).limit(1);
  return result[0];
};

export const insertRetention = async (data) => {
  data.dueDate = new Date(data.dueDate);
  const result = await db.insert(retentions).values(data).returning();
  return result[0];
};

export const updateRetention = async (id, data, userContext) => {
  const scope = getTenantScope(retentions, userContext);
  const condition = scope ? and(eq(retentions.id, id), scope) : eq(retentions.id, id);
  
  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  data.updatedAt = new Date();
  
  const result = await db.update(retentions).set(data).where(condition).returning();
  return result[0];
};

export const deleteRetention = async (id, userContext) => {
  const scope = getTenantScope(retentions, userContext);
  const condition = scope ? and(eq(retentions.id, id), scope) : eq(retentions.id, id);
  
  const result = await db.delete(retentions).where(condition).returning();
  return result[0];
};