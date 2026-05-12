// src/modules/documentation/documentation.repository.js
import { db } from '../../config/database.js';
import { documentations } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findDocsByUnitId = async (unitId, userContext) => {
  const scope = getTenantScope(documentations, userContext);
  const condition = scope ? and(eq(documentations.unitId, unitId), scope) : eq(documentations.unitId, unitId);
  return await db.select().from(documentations).where(condition).orderBy(documentations.createdAt);
};

export const findDocById = async (id, userContext) => {
  const scope = getTenantScope(documentations, userContext);
  const condition = scope ? and(eq(documentations.id, id), scope) : eq(documentations.id, id);
  const result = await db.select().from(documentations).where(condition).limit(1);
  return result[0];
};

export const insertDoc = async (data) => {
  const result = await db.insert(documentations).values(data).returning();
  return result[0];
};

export const deleteDoc = async (id, userContext) => {
  const scope = getTenantScope(documentations, userContext);
  const condition = scope ? and(eq(documentations.id, id), scope) : eq(documentations.id, id);
  const result = await db.delete(documentations).where(condition).returning();
  return result[0];
};