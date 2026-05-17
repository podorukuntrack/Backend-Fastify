// src/modules/handovers/handover.repository.js
import { db } from '../../config/database.js';
import { handovers, handoverDefects } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

const toISO = (v) => (v ? new Date(v).toISOString() : null);

const mapHandoverRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    company_id: row.companyId,
    unit_id: row.unitId,
    scheduled_date: toISO(row.scheduledDate),
    proposed_date: toISO(row.proposedDate),
    actual_date: toISO(row.actualDate),
    status: row.status,
    notes: row.notes,
    created_at: toISO(row.createdAt),
    updated_at: toISO(row.updatedAt),
  };
};

export const findHandovers = async (userContext, filters = {}) => {
  const scope = getTenantScope(handovers, userContext);
  
  const conditions = [];
  if (scope) conditions.push(scope);
  
  const unitId = filters.unitId || filters.unit_id;
  if (unitId) conditions.push(eq(handovers.unitId, unitId));
  
  if (filters.status) conditions.push(eq(handovers.status, filters.status));
  
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const result = await db.select().from(handovers).where(where);
  return result.map(mapHandoverRow);
};

export const findHandoverById = async (id, userContext) => {
  // Find by ID — scope check done separately if needed
  const result = await db.select().from(handovers).where(eq(handovers.id, id)).limit(1);
  return mapHandoverRow(result[0]);
};

export const insertHandover = async (data) => {
  if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
  if (data.proposedDate) data.proposedDate = new Date(data.proposedDate);
  if (data.actualDate) data.actualDate = new Date(data.actualDate);
  
  const result = await db.insert(handovers).values(data).returning();
  return mapHandoverRow(result[0]);
};

export const updateHandover = async (id, data, userContext) => {
  data.updatedAt = new Date();
  if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
  if (data.proposedDate) data.proposedDate = new Date(data.proposedDate);
  if (data.actualDate) data.actualDate = new Date(data.actualDate);

  // Always update by ID only — write access is gated by authorize middleware
  const result = await db.update(handovers).set(data).where(eq(handovers.id, id)).returning();
  return mapHandoverRow(result[0]);
};

// === DEFECTS / CACAT BANGUNAN ===
export const insertDefect = async (data) => {
  const result = await db.insert(handoverDefects).values(data).returning();
  return result[0];
};