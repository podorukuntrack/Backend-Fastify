import { db } from '../../config/database.js';
import { assignments } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findAllAssignments = async (userContext) => {
  const scope = getTenantScope(assignments, userContext);
  return await db.select().from(assignments).where(scope);
};

export const findAssignmentById = async (id, userContext) => {
  const scope = getTenantScope(assignments, userContext);
  const condition = scope ? and(eq(assignments.id, id), scope) : eq(assignments.id, id);
  const result = await db.select().from(assignments).where(condition).limit(1);
  return result[0];
};

export const insertAssignment = async (data) => {
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const result = await db.insert(assignments).values(data).returning();
  return result[0];
};

export const updateAssignment = async (id, data, userContext) => {
  const scope = getTenantScope(assignments, userContext);
  const condition = scope ? and(eq(assignments.id, id), scope) : eq(assignments.id, id);
  
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  data.updatedAt = new Date();
  
  const result = await db.update(assignments).set(data).where(condition).returning();
  return result[0];
};