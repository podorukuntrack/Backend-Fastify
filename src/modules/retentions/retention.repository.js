import { db } from '../../config/database.js';
import { retentions } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

const toISO = (v) => (v ? new Date(v).toISOString() : null);

const mapRetentionRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    company_id: row.companyId,
    unit_id: row.unitId,
    amount: Number(row.amount ?? 0),
    due_date: toISO(row.dueDate),
    status: row.status,
    notes: row.notes,
    created_at: toISO(row.createdAt),
    updated_at: toISO(row.updatedAt),
  };
};

export const findRetentions = async (userContext, filters = {}) => {
  const scope = getTenantScope(retentions, userContext);
  const conditions = [];
  if (scope) conditions.push(scope);
  const unitId = filters.unitId ?? filters.unit_id;
  if (unitId) conditions.push(eq(retentions.unitId, unitId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const result = await db.select().from(retentions).where(where).orderBy(retentions.dueDate);
  return result.map(mapRetentionRow);
};

export const findRetentionById = async (id, userContext) => {
  const scope = getTenantScope(retentions, userContext);
  const condition = scope ? and(eq(retentions.id, id), scope) : eq(retentions.id, id);
  const result = await db.select().from(retentions).where(condition).limit(1);
  return mapRetentionRow(result[0]);
};

export const insertRetention = async (data) => {
  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  const result = await db.insert(retentions).values(data).returning();
  return mapRetentionRow(result[0]);
};

export const updateRetention = async (id, data, userContext) => {
  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  data.updatedAt = new Date();
  // Update by ID only — auth already gated by authorize middleware
  const result = await db.update(retentions).set(data).where(eq(retentions.id, id)).returning();
  return mapRetentionRow(result[0]);
};

export const deleteRetention = async (id, userContext) => {
  const scope = getTenantScope(retentions, userContext);
  const condition = scope ? and(eq(retentions.id, id), scope) : eq(retentions.id, id);
  
  const result = await db.delete(retentions).where(condition).returning();
  return mapRetentionRow(result[0]);
};