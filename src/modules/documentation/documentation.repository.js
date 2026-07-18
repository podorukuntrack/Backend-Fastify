import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";
import { AppError } from '../../shared/utils/AppError.js';

const mapDocRow = (row) => ({
  id: row.id,
  unit_id: row.unit_id,
  unitId: row.unit_id,
  progress_id: row.progress_id,
  progressId: row.progress_id,
  jenis: row.jenis,
  url: row.url,
  r2_key: row.r2_key,
  nama_file: row.nama_file,
  namaFile: row.nama_file,
  ukuran_bytes: Number(row.ukuran_bytes ?? 0),
  created_at: row.created_at,
  unit: row.unit_id
    ? {
        id: row.unit_id,
        nomor_unit: row.nomor_unit,
      }
    : null,
  progress: row.progress_id
    ? {
        id: row.progress_id,
        tahap: row.tahap,
        progress_percentage: row.progress_percentage,
      }
    : null,
});

export const findAllDocs = async (userContext, filters = {}) => {
  const jenis = filters.jenis ?? filters.type ?? null;
  const unitId = filters.unitId ?? filters.unit_id ?? null;

  let scopeCondition;
  if (['super_admin', 'owner'].includes(userContext.role)) {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`d.unit_id IN (SELECT unit_id FROM property_assignments WHERE user_id = ${userContext.sub}::uuid)`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.unit_id,
      d.progress_id,
      d.jenis,
      d.url,
      d.r2_key,
      d.nama_file,
      d.ukuran_bytes,
      d.created_at,
      u.nomor_unit,
      pr.tahap,
      pr.progress_percentage
    FROM documentation d
    JOIN units u ON u.id = d.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    LEFT JOIN progress pr ON pr.id = d.progress_id
    WHERE ${scopeCondition}
      AND (${unitId}::uuid IS NULL OR d.unit_id = ${unitId}::uuid)
      AND (${jenis}::text IS NULL OR d.jenis::text = ${jenis}::text)
    ORDER BY d.created_at DESC
  `);

  return rows.map(mapDocRow);
};

export const findDocsByUnitId = async (unitId, userContext) => {
  let scopeCondition;
  if (['super_admin', 'owner'].includes(userContext.role)) {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`d.unit_id IN (SELECT unit_id FROM property_assignments WHERE user_id = ${userContext.sub}::uuid)`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.unit_id,
      d.progress_id,
      d.jenis,
      d.url,
      d.r2_key,
      d.nama_file,
      d.ukuran_bytes,
      d.created_at,
      u.nomor_unit,
      pr.tahap,
      pr.progress_percentage
    FROM documentation d
    JOIN units u ON u.id = d.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    LEFT JOIN progress pr ON pr.id = d.progress_id
    WHERE d.unit_id = ${unitId}
      AND ${scopeCondition}
    ORDER BY d.created_at DESC
  `);

  return rows.map(mapDocRow);
};

export const findDocById = async (id, userContext) => {
  let scopeCondition;
  if (['super_admin', 'owner'].includes(userContext.role)) {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`d.unit_id IN (SELECT unit_id FROM property_assignments WHERE user_id = ${userContext.sub}::uuid)`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.unit_id,
      d.progress_id,
      d.jenis,
      d.url,
      d.r2_key,
      d.nama_file,
      d.ukuran_bytes,
      d.created_at,
      u.nomor_unit,
      pr.tahap,
      pr.progress_percentage
    FROM documentation d
    JOIN units u ON u.id = d.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    LEFT JOIN progress pr ON pr.id = d.progress_id
    WHERE d.id = ${id}
      AND ${scopeCondition}
    LIMIT 1
  `);

  return rows[0] ? mapDocRow(rows[0]) : null;
};

export const insertDoc = async (data) => {
  const rows = await db.execute(sql`
    INSERT INTO documentation (
      unit_id,
      progress_id,
      jenis,
      url,
      r2_key,
      nama_file,
      ukuran_bytes,
      created_by
    )
    VALUES (
      ${data.unit_id},
      ${data.progress_id ?? null},
      ${data.jenis},
      ${data.url},
      ${data.r2_key},
      ${data.nama_file},
      ${data.ukuran_bytes ?? 0},
      ${data.created_by}
    )
    RETURNING id, url
  `);

  return rows[0];
};

export const deleteDoc = async (id, userContext) => {
  const doc = await findDocById(id, userContext);
  if (!doc) return null;

  const rows = await db.execute(sql`
    DELETE FROM documentation
     WHERE id = ${id}
    RETURNING id
  `);

  return rows[0];
};

export const updateDoc = async (id, data, userContext) => {
  const doc = await findDocById(id, userContext);
  if (!doc) return null;

  const updates = [];
  if (data.nama_file) updates.push(sql`nama_file = ${data.nama_file}`);
  if (data.jenis) updates.push(sql`jenis = ${data.jenis}`);

  if (updates.length === 0) return doc; // Nothing to update

  // Join the sql statements with comma
  const setSql = sql.join(updates, sql`, `);

  const rows = await db.execute(sql`
    UPDATE documentation
    SET ${setSql}
    WHERE id = ${id}
    RETURNING *
  `);

  return rows[0] ? mapDocRow(rows[0]) : null;
};
