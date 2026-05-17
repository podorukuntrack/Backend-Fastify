import { db } from "../../config/database.js";
import { sql } from "drizzle-orm";

const mapClusterRow = (row) => ({
  id: row.id,
  project_id: row.project_id,
  nama_cluster: row.nama_cluster,
  jumlah_unit: row.jumlah_unit,
  created_at: row.created_at,
  updated_at: row.updated_at,
  project: row.project_id
    ? {
        id: row.project_id,
        nama_proyek: row.nama_proyek,
      }
    : null,
});

export const findAllClusters = async (userContext, filters = {}) => {
  const projectId = filters.project_id ?? filters.projectId ?? null;
  const search = filters.search?.trim() ?? "";
  const limit = Number(filters.limit ?? 100);
  const page = Number(filters.page ?? 1);
  const offset = (page - 1) * limit;

  let scopeCondition;
  if (userContext.role === 'super_admin') {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`c.id IN (
      SELECT un.cluster_id 
      FROM property_assignments pa
      JOIN units un ON un.id = pa.unit_id
      WHERE pa.user_id = ${userContext.sub}::uuid
    )`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.project_id,
      c.nama_cluster,
      c.jumlah_unit,
      c.created_at,
      c.updated_at,
      p.nama_proyek
    FROM clusters c
    JOIN projects p ON p.id = c.project_id
    WHERE ${scopeCondition}
      AND (${projectId}::uuid IS NULL OR c.project_id = ${projectId}::uuid)
      AND (${search} = '' OR c.nama_cluster ILIKE ${`%${search}%`})
    ORDER BY c.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map(mapClusterRow);
};

export const findClusterById = async (id, userContext) => {
  let scopeCondition;
  if (userContext.role === 'super_admin') {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`c.id IN (
      SELECT un.cluster_id 
      FROM property_assignments pa
      JOIN units un ON un.id = pa.unit_id
      WHERE pa.user_id = ${userContext.sub}::uuid
    )`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

  const rows = await db.execute(sql`
    SELECT
      c.id,
      c.project_id,
      c.nama_cluster,
      c.jumlah_unit,
      c.created_at,
      c.updated_at,
      p.nama_proyek
    FROM clusters c
    JOIN projects p ON p.id = c.project_id
    WHERE c.id = ${id}
      AND ${scopeCondition}
    LIMIT 1
  `);

  return rows[0] ? mapClusterRow(rows[0]) : null;
};

export const insertCluster = async (data) => {
  const rows = await db.execute(sql`
    INSERT INTO clusters (project_id, nama_cluster, jumlah_unit)
    VALUES (${data.project_id}, ${data.nama_cluster}, ${data.jumlah_unit ?? 0})
    RETURNING id, project_id, nama_cluster, jumlah_unit, created_at, updated_at
  `);

  return mapClusterRow(rows[0]);
};

export const updateCluster = async (id, data, userContext) => {
  const existing = await findClusterById(id, userContext);
  if (!existing) return null;

  const rows = await db.execute(sql`
    UPDATE clusters
       SET project_id = COALESCE(${data.project_id ?? null}, project_id),
           nama_cluster = COALESCE(${data.nama_cluster ?? null}, nama_cluster),
           jumlah_unit = COALESCE(${data.jumlah_unit ?? null}, jumlah_unit),
           updated_at = NOW()
     WHERE id = ${id}
    RETURNING id, project_id, nama_cluster, jumlah_unit, created_at, updated_at
  `);

  return mapClusterRow(rows[0]);
};

export const deleteCluster = async (id, userContext) => {
  const existing = await findClusterById(id, userContext);
  if (!existing) return null;

  const rows = await db.execute(sql`
    DELETE FROM clusters
     WHERE id = ${id}
    RETURNING id, project_id, nama_cluster, jumlah_unit, created_at, updated_at
  `);

  return mapClusterRow(rows[0]);
};
