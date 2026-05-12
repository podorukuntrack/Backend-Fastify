// src/modules/handovers/handover.repository.js
import { db } from '../../config/database.js';
import { handovers, handoverDefects } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findHandovers = async (userContext) => {
  const scope = getTenantScope(handovers, userContext);
  return await db.select().from(handovers).where(scope);
};

export const findHandoverById = async (id, userContext) => {
  const scope = getTenantScope(handovers, userContext);
  const condition = scope ? and(eq(handovers.id, id), scope) : eq(handovers.id, id);
  const result = await db.select().from(handovers).where(condition).limit(1);
  return result[0];
};

export const insertHandover = async (data) => {
  data.scheduledDate = new Date(data.scheduledDate);
  const result = await db.insert(handovers).values(data).returning();
  return result[0];
};

export const updateHandover = async (id, data, userContext) => {
  const scope = getTenantScope(handovers, userContext);
  const condition = scope ? and(eq(handovers.id, id), scope) : eq(handovers.id, id);
  data.updatedAt = new Date();
  
  const result = await db.update(handovers).set(data).where(condition).returning();
  return result[0];
};

// === DEFECTS / CACAT BANGUNAN ===
export const insertDefect = async (data) => {
  const result = await db.insert(handoverDefects).values(data).returning();
  return result[0];
};