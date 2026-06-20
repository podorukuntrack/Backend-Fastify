import { db } from '../../config/database.js';
import { retentions, retentionComplaints } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

const toISO = (v) => (v ? new Date(v).toISOString() : null);

const mapRetentionRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    company_id: row.companyId,
    unit_id: row.unitId,
    due_date: toISO(row.dueDate),
    status: row.status,
    notes: row.notes,
    link_foto_360: row.linkFoto360,
    photo_before_url: row.photoBeforeUrl,
    photo_after_url: row.photoAfterUrl,
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

const mapComplaintRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    retention_id: row.retentionId,
    description: row.description,
    photo_before_urls: row.photoBeforeUrls || [],
    photo_after_urls: row.photoAfterUrls || [],
    status: row.status,
    created_at: toISO(row.createdAt),
    updated_at: toISO(row.updatedAt),
  };
};

export const findComplaintsByRetentionId = async (retentionId) => {
  const result = await db.select().from(retentionComplaints).where(eq(retentionComplaints.retentionId, retentionId)).orderBy(retentionComplaints.createdAt);
  return result.map(mapComplaintRow);
};

export const insertComplaint = async (data) => {
  const result = await db.insert(retentionComplaints).values(data).returning();
  return mapComplaintRow(result[0]);
};

export const updateComplaint = async (id, data) => {
  data.updatedAt = new Date();
  const result = await db.update(retentionComplaints).set(data).where(eq(retentionComplaints.id, id)).returning();
  return mapComplaintRow(result[0]);
};

export const deleteComplaint = async (id) => {
  const result = await db.delete(retentionComplaints).where(eq(retentionComplaints.id, id)).returning();
  return mapComplaintRow(result[0]);
};