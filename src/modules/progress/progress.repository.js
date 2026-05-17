import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";

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
  tahap: data.tahap ?? data.stage ?? "Progress",
  progress_percentage: Math.min(
    100,
    data.progress_percentage ?? data.progressPercentage ?? 0,
  ),
  tanggal_update: data.tanggal_update ?? new Date(),
  catatan: data.catatan ?? data.notes ?? null,
});

export const findAllProgress = async (userContext, filters = {}) => {
  const unitId = filters.unit_id ?? filters.unitId ?? null;
  const limit = Number(filters.limit ?? 100);
  const page = Number(filters.page ?? 1);
  const offset = (page - 1) * limit;

  let scopeCondition;
  if (userContext.role === 'super_admin') {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`pr.unit_id IN (SELECT unit_id FROM property_assignments WHERE user_id = ${userContext.sub}::uuid)`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

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
    WHERE ${scopeCondition}
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
  let scopeCondition;
  if (userContext.role === 'super_admin') {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`pr.unit_id IN (SELECT unit_id FROM property_assignments WHERE user_id = ${userContext.sub}::uuid)`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

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
      AND ${scopeCondition}
    LIMIT 1
  `);

  return rows[0] ? mapProgressRow(rows[0]) : null;
};

export const insertProgress = async (data, userContext) => {
  const value = normalizeProgressInput(data);

  const timelineCheck = await db.execute(sql`
  SELECT id
  FROM timelines
  WHERE unit_id = ${value.unit_id}
    AND task_name = ${value.tahap}
  LIMIT 1
`);

  if (!timelineCheck.length) {
    throw new Error("Tahap tidak ditemukan pada timeline unit ini");
  }

  const rows = await db.execute(sql`
    INSERT INTO progress (unit_id, tahap, progress_percentage, tanggal_update, catatan, created_by)
    VALUES (${value.unit_id}, ${value.tahap}, ${value.progress_percentage}, ${value.tanggal_update ?? null}, ${value.catatan}, ${userContext.sub})
    RETURNING id
  `);

  // Hitung ulang total progress untuk unit berdasarkan rata-rata timeline
  const totalRes = await db.execute(sql`
    SELECT 
      COALESCE(
        SUM(LEAST(100, COALESCE(tp.total_tahap, 0))) / NULLIF(COUNT(t.id), 0), 
        0
      ) AS total
    FROM timelines t
    LEFT JOIN (
      SELECT tahap, SUM(progress_percentage) AS total_tahap
      FROM progress
      WHERE unit_id = ${value.unit_id}
      GROUP BY tahap
    ) tp ON tp.tahap = t.task_name
    WHERE t.unit_id = ${value.unit_id}
  `);

  const total = Math.round(Number(totalRes[0].total ?? 0));

  await db.execute(sql`
    UPDATE units
       SET progress_percentage = ${total},
           status_pembangunan = CASE
             WHEN ${total} >= 100 THEN 'selesai'
             WHEN ${total} > 0 THEN 'dalam_pembangunan'
             ELSE status_pembangunan
           END,
           updated_at = NOW()
     WHERE id = ${value.unit_id}
  `);

  await db.execute(sql`
    UPDATE timelines
    SET status = CASE
      WHEN COALESCE((SELECT SUM(progress_percentage) FROM progress WHERE unit_id = timelines.unit_id AND tahap = timelines.task_name), 0) >= 100 THEN 'completed'
      WHEN COALESCE((SELECT SUM(progress_percentage) FROM progress WHERE unit_id = timelines.unit_id AND tahap = timelines.task_name), 0) > 0 THEN 'on_progress'
      ELSE 'planned'
    END
    WHERE unit_id = ${value.unit_id}
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
    RETURNING unit_id
  `);

  const unitId = rows[0].unit_id;
  const totalRes = await db.execute(sql`
    SELECT 
      COALESCE(
        SUM(LEAST(100, COALESCE(tp.total_tahap, 0))) / NULLIF(COUNT(t.id), 0), 
        0
      ) AS total
    FROM timelines t
    LEFT JOIN (
      SELECT tahap, SUM(progress_percentage) AS total_tahap
      FROM progress
      WHERE unit_id = ${unitId}
      GROUP BY tahap
    ) tp ON tp.tahap = t.task_name
    WHERE t.unit_id = ${unitId}
  `);
  const total = Math.round(Number(totalRes[0].total ?? 0));

  await db.execute(sql`
    UPDATE units
       SET progress_percentage = ${total},
           status_pembangunan = CASE
             WHEN ${total} >= 100 THEN 'selesai'
             WHEN ${total} > 0 THEN 'dalam_pembangunan'
             ELSE status_pembangunan
           END,
           updated_at = NOW()
     WHERE id = ${unitId}
  `);

  await db.execute(sql`
    UPDATE timelines
    SET status = CASE
      WHEN COALESCE((SELECT SUM(progress_percentage) FROM progress WHERE unit_id = timelines.unit_id AND tahap = timelines.task_name), 0) >= 100 THEN 'completed'
      WHEN COALESCE((SELECT SUM(progress_percentage) FROM progress WHERE unit_id = timelines.unit_id AND tahap = timelines.task_name), 0) > 0 THEN 'on_progress'
      ELSE 'planned'
    END
    WHERE unit_id = ${unitId}
  `);

  return await findProgressById(id, userContext);
};

export const deleteProgress = async (id, userContext) => {
  const existing = await findProgressById(id, userContext);
  if (!existing) return null;

  const unitId = existing.unit_id;

  const rows = await db.execute(sql`
    DELETE FROM progress
     WHERE id = ${id}
    RETURNING id
  `);

  const totalRes = await db.execute(sql`
    SELECT 
      COALESCE(
        SUM(LEAST(100, COALESCE(tp.total_tahap, 0))) / NULLIF(COUNT(t.id), 0), 
        0
      ) AS total
    FROM timelines t
    LEFT JOIN (
      SELECT tahap, SUM(progress_percentage) AS total_tahap
      FROM progress
      WHERE unit_id = ${unitId}
      GROUP BY tahap
    ) tp ON tp.tahap = t.task_name
    WHERE t.unit_id = ${unitId}
  `);

  const total = Math.round(Number(totalRes[0].total ?? 0));

  await db.execute(sql`
    UPDATE units
       SET progress_percentage = ${total},
           status_pembangunan = CASE
             WHEN ${total} >= 100 THEN 'selesai'
             WHEN ${total} > 0 THEN 'dalam_pembangunan'
             ELSE status_pembangunan
           END,
           updated_at = NOW()
     WHERE id = ${unitId}
  `);

  await db.execute(sql`
    UPDATE timelines
    SET status = CASE
      WHEN COALESCE((SELECT SUM(progress_percentage) FROM progress WHERE unit_id = timelines.unit_id AND tahap = timelines.task_name), 0) >= 100 THEN 'completed'
      WHEN COALESCE((SELECT SUM(progress_percentage) FROM progress WHERE unit_id = timelines.unit_id AND tahap = timelines.task_name), 0) > 0 THEN 'on_progress'
      ELSE 'planned'
    END
    WHERE unit_id = ${unitId}
  `);

  return rows[0];
};
