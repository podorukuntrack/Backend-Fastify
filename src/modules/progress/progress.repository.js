import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

const mapProgressRow = (row) => ({
  id: row.id,
  unit_id: row.unit_id,
  tahap: row.tahap,
  progress_percentage: row.progress_percentage,
  tanggal_update: row.tanggal_update,
  catatan: row.catatan,
  created_at: row.created_at,
  updated_at: row.updated_at,
  unit: row.unit_id
    ? {
        id: row.unit_id,
        nomor_unit: row.nomor_unit,
      }
    : null,
});

const normalizeProgressInput = (data) => ({
  unit_id: data.unit_id ?? data.unitId,
  tahap: data.tahap ?? data.stage ?? 'Progress',
  progress_percentage: data.progress_percentage ?? data.progressPercentage ?? data.percentage ?? 0,
  tanggal_update: data.tanggal_update ?? null,
  catatan: data.catatan ?? data.notes ?? null,
});

export const findAllProgress = async (userContext, filters = {}) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;
  const unitId = filters.unit_id ?? filters.unitId ?? null;
  const limit = Number(filters.limit ?? 100);
  const page = Number(filters.page ?? 1);
  const offset = (page - 1) * limit;

  const rows = await db.execute(sql`
    SELECT
      pr.id,
      pr.unit_id,
      pr.tahap,
      pr.progress_percentage,
      pr.tanggal_update,
      pr.catatan,
      pr.created_at,
      pr.updated_at,
      u.nomor_unit
    FROM progress pr
    JOIN units u ON u.id = pr.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
      AND (${unitId}::uuid IS NULL OR pr.unit_id = ${unitId}::uuid)
    ORDER BY pr.tanggal_update DESC, pr.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map(mapProgressRow);
};

export const findProgressByUnitId = async (unitId, userContext) => {
  return await findAllProgress(userContext, { unit_id: unitId, limit: 1000 });
};

export const findProgressById = async (id, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;

  const rows = await db.execute(sql`
    SELECT
      pr.id,
      pr.unit_id,
      pr.tahap,
      pr.progress_percentage,
      pr.tanggal_update,
      pr.catatan,
      pr.created_at,
      pr.updated_at,
      u.nomor_unit
    FROM progress pr
    JOIN units u ON u.id = pr.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE pr.id = ${id}
      AND (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
    LIMIT 1
  `);

  return rows[0] ? mapProgressRow(rows[0]) : null;
};

export const insertProgress = async (data, userContext) => {
  const value = normalizeProgressInput(data);
  const rows = await db.execute(sql`
    INSERT INTO progress (unit_id, tahap, progress_percentage, tanggal_update, catatan, created_by)
    VALUES (${value.unit_id}, ${value.tahap}, ${value.progress_percentage}, ${value.tanggal_update ?? null}, ${value.catatan}, ${userContext.sub})
    RETURNING id
  `);

  await db.execute(sql`
    UPDATE units
       SET progress_percentage = LEAST(100, progress_percentage + ${value.progress_percentage}),
           status_pembangunan = CASE
             WHEN LEAST(100, progress_percentage + ${value.progress_percentage}) >= 100 THEN 'selesai'
             WHEN LEAST(100, progress_percentage + ${value.progress_percentage}) > 0 THEN 'dalam_pembangunan'
             ELSE status_pembangunan
           END,
           updated_at = NOW()
     WHERE id = ${value.unit_id}
  `);

  return await findProgressById(rows[0].id, userContext);
};

export const updateProgress = async (id, data, userContext) => {
  const existing = await findProgressById(id, userContext);
  if (!existing) return null;

  const value = normalizeProgressInput(data);
  const rows = await db.execute(sql`
    UPDATE progress
       SET unit_id = COALESCE(${value.unit_id ?? null}, unit_id),
           tahap = COALESCE(${value.tahap ?? null}, tahap),
           progress_percentage = COALESCE(${value.progress_percentage ?? null}, progress_percentage),
           tanggal_update = COALESCE(${value.tanggal_update ?? null}, tanggal_update),
           catatan = COALESCE(${value.catatan ?? null}, catatan),
           updated_at = NOW()
     WHERE id = ${id}
    RETURNING id
  `);

  return await findProgressById(rows[0].id, userContext);
};

export const deleteProgress = async (id, userContext) => {
  const existing = await findProgressById(id, userContext);
  if (!existing) return null;

  const rows = await db.execute(sql`
    DELETE FROM progress
     WHERE id = ${id}
    RETURNING id
  `);

  return rows[0];
};
