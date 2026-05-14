import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

const mapDocRow = (row) => ({
  id: row.id,
  unit_id: row.unit_id,
  progress_id: row.progress_id,
  jenis: row.jenis,
  url: row.url,
  r2_key: row.cloudinary_public_id,
  nama_file: row.nama_file,
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
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;
  const jenis = filters.jenis ?? filters.type ?? null;

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.unit_id,
      d.progress_id,
      d.jenis,
      d.url,
      d.cloudinary_public_id,
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
    WHERE (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
      AND (${jenis}::doc_type IS NULL OR d.jenis = ${jenis}::doc_type)
    ORDER BY d.created_at DESC
  `);

  return rows.map(mapDocRow);
};

export const findDocsByUnitId = async (unitId, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.unit_id,
      d.progress_id,
      d.jenis,
      d.url,
      d.cloudinary_public_id,
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
      AND (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
    ORDER BY d.created_at DESC
  `);

  return rows.map(mapDocRow);
};

export const findDocById = async (id, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.unit_id,
      d.progress_id,
      d.jenis,
      d.url,
      d.cloudinary_public_id,
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
      AND (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
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
      cloudinary_public_id,
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
    RETURNING id
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
