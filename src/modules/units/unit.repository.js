import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

const mapUnitRow = (row) => ({
  id: row.id,
  cluster_id: row.cluster_id,
  nomor_unit: row.nomor_unit,
  tipe_rumah: row.tipe_rumah,
  luas_tanah: row.luas_tanah,
  luas_bangunan: row.luas_bangunan,
  status_pembangunan: row.status_pembangunan,
  progress_percentage: row.progress_percentage,
  created_at: row.created_at,
  updated_at: row.updated_at,
  cluster: row.cluster_id
    ? {
        id: row.cluster_id,
        nama_cluster: row.nama_cluster,
        jumlah_unit: row.jumlah_unit,
        project: row.project_id
          ? {
              id: row.project_id,
              nama_proyek: row.nama_proyek,
            }
          : null,
      }
    : null,
});

const normalizeUnitInput = (data) => ({
  cluster_id: data.cluster_id ?? data.clusterId,
  nomor_unit: data.nomor_unit ?? data.nomorUnit,
  tipe_rumah: data.tipe_rumah ?? data.tipeRumah,
  luas_tanah: data.luas_tanah ?? data.luasTanah ?? null,
  luas_bangunan: data.luas_bangunan ?? data.luasBangunan ?? null,
  status_pembangunan: data.status_pembangunan ?? data.statusPembangunan ?? 'belum_mulai',
  progress_percentage: data.progress_percentage ?? data.progressPercentage ?? 0,
});

export const findAllUnits = async (userContext, filters = {}) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;
  const clusterId = filters.cluster_id ?? filters.clusterId ?? null;
  const status = filters.status_pembangunan ?? filters.statusPembangunan ?? null;
  const search = filters.search?.trim() ?? '';
  const limit = Number(filters.limit ?? 20);
  const page = Number(filters.page ?? 1);
  const offset = (page - 1) * limit;

  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.cluster_id,
      u.nomor_unit,
      u.tipe_rumah,
      u.luas_tanah,
      u.luas_bangunan,
      u.status_pembangunan,
      u.progress_percentage,
      u.created_at,
      u.updated_at,
      c.nama_cluster,
      c.jumlah_unit,
      p.id AS project_id,
      p.nama_proyek
    FROM units u
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
      AND (${clusterId}::uuid IS NULL OR u.cluster_id = ${clusterId}::uuid)
      AND (${status}::unit_status IS NULL OR u.status_pembangunan = ${status}::unit_status)
      AND (${search} = '' OR u.nomor_unit ILIKE ${`%${search}%`} OR u.tipe_rumah ILIKE ${`%${search}%`})
    ORDER BY u.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map(mapUnitRow);
};

export const findUnitById = async (id, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;

  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.cluster_id,
      u.nomor_unit,
      u.tipe_rumah,
      u.luas_tanah,
      u.luas_bangunan,
      u.status_pembangunan,
      u.progress_percentage,
      u.created_at,
      u.updated_at,
      c.nama_cluster,
      c.jumlah_unit,
      p.id AS project_id,
      p.nama_proyek
    FROM units u
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE u.id = ${id}
      AND (${companyId}::uuid IS NULL OR p.company_id = ${companyId}::uuid)
    LIMIT 1
  `);

  return rows[0] ? mapUnitRow(rows[0]) : null;
};

export const findUnitDetailById = findUnitById;

export const insertUnit = async (data) => {
  const value = normalizeUnitInput(data);
  const rows = await db.execute(sql`
    INSERT INTO units (
      cluster_id,
      nomor_unit,
      tipe_rumah,
      luas_tanah,
      luas_bangunan,
      status_pembangunan,
      progress_percentage
    )
    VALUES (
      ${value.cluster_id},
      ${value.nomor_unit},
      ${value.tipe_rumah},
      ${value.luas_tanah},
      ${value.luas_bangunan},
      ${value.status_pembangunan},
      ${value.progress_percentage}
    )
    RETURNING id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, created_at, updated_at
  `);

  return mapUnitRow(rows[0]);
};

export const insertUnits = async (unitsData) => {
  const result = [];

  for (const data of unitsData) {
    result.push(await insertUnit(data));
  }

  return result;
};

export const updateUnit = async (id, data, userContext) => {
  const existing = await findUnitById(id, userContext);
  if (!existing) return null;

  const value = normalizeUnitInput(data);
  const rows = await db.execute(sql`
    UPDATE units
       SET cluster_id = COALESCE(${value.cluster_id ?? null}, cluster_id),
           nomor_unit = COALESCE(${value.nomor_unit ?? null}, nomor_unit),
           tipe_rumah = COALESCE(${value.tipe_rumah ?? null}, tipe_rumah),
           luas_tanah = COALESCE(${value.luas_tanah ?? null}, luas_tanah),
           luas_bangunan = COALESCE(${value.luas_bangunan ?? null}, luas_bangunan),
           status_pembangunan = COALESCE(${value.status_pembangunan ?? null}, status_pembangunan),
           progress_percentage = COALESCE(${value.progress_percentage ?? null}, progress_percentage),
           updated_at = NOW()
     WHERE id = ${id}
    RETURNING id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, created_at, updated_at
  `);

  return mapUnitRow(rows[0]);
};

export const deleteUnit = async (id, userContext) => {
  const existing = await findUnitById(id, userContext);
  if (!existing) return null;

  const rows = await db.execute(sql`
    DELETE FROM units
     WHERE id = ${id}
    RETURNING id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, created_at, updated_at
  `);

  return mapUnitRow(rows[0]);
};
