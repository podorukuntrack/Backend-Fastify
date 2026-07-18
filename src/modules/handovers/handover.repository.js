// src/modules/handovers/handover.repository.js
import { db } from '../../config/database.js';
import { handovers, handoverDefects } from '../../shared/schemas/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';
import { AppError } from '../../shared/utils/AppError.js';

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
    image_url: row.imageUrl,
    document_url: row.documentUrl,
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
  const scope = getTenantScope(handovers, userContext);
  const conditions = [eq(handovers.id, id)];
  if (scope) conditions.push(scope);
  
  const result = await db.select().from(handovers).where(and(...conditions)).limit(1);
  if (!result || result.length === 0) return null;
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

  const scope = getTenantScope(handovers, userContext);
  const conditions = [eq(handovers.id, id)];
  if (scope) conditions.push(scope);

  const result = await db.update(handovers).set(data).where(and(...conditions)).returning();
  if (!result || result.length === 0) throw new AppError("Data Serah Terima tidak ditemukan atau akses ditolak", 400);
  return mapHandoverRow(result[0]);
};

export const deleteHandover = async (id, userContext) => {
  const existing = await findHandoverById(id, userContext);
  if (!existing) throw new AppError("Data Serah Terima tidak ditemukan atau akses ditolak", 400);

  const retentionRes = await db.execute(sql`SELECT COUNT(*) as count FROM retentions WHERE unit_id = ${existing.unit_id}`);
  if (Number(retentionRes[0].count) > 0) {
    throw new AppError("Gagal menghapus Serah Terima. Masih terdapat data Retensi / Garansi. Harap hapus data Retensi terlebih dahulu.", 400);
  }

  const scope = getTenantScope(handovers, userContext);
  const conditions = [eq(handovers.id, id)];
  if (scope) conditions.push(scope);
  
  return await db.transaction(async (tx) => {
    // Delete handover defects first to avoid foreign key constraints
    await tx.delete(handoverDefects).where(eq(handoverDefects.handoverId, id));
    
    const result = await tx.delete(handovers).where(and(...conditions)).returning();
    return mapHandoverRow(result[0]);
  });
};

// === DEFECTS / CACAT BANGUNAN ===
export const insertDefect = async (data) => {
  const result = await db.insert(handoverDefects).values(data).returning();
  return result[0];
};