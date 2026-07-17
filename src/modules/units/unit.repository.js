import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import { units } from '../../shared/schemas/schema.js';
import { clearDashboardCache } from '../../shared/utils/cache.js';

const mapUnitRow = (row) => ({
  id: row.id,
  cluster_id: row.cluster_id,
  nomor_unit: row.nomor_unit,
  tipe_rumah: row.tipe_rumah,
  luas_tanah: row.luas_tanah,
  luas_bangunan: row.luas_bangunan,
  status_pembangunan: row.status_pembangunan,
  progress_percentage: row.progress_percentage,
  image_url: row.image_url,
  created_at: row.created_at,
  updated_at: row.updated_at,
  nama_perusahaan: row.nama_perusahaan,
  company_id: row.company_id,
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
  image_url: data.image_url ?? data.imageUrl ?? null,
});

export const findAllUnits = async (userContext, filters = {}) => {
  const clusterId = filters.cluster_id ?? filters.clusterId ?? null;
  const status = filters.status_pembangunan ?? filters.statusPembangunan ?? null;
  const search = filters.search?.trim() ?? '';
  const limit = Number(filters.limit ?? 20);
  const page = Number(filters.page ?? 1);
  const offset = (page - 1) * limit;

  let scopeCondition;
  if (['super_admin', 'owner'].includes(userContext.role)) {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`u.id IN (SELECT unit_id FROM property_assignments WHERE user_id = ${userContext.sub}::uuid)`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

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
      u.image_url,
      u.created_at,
      u.updated_at,
      c.nama_cluster,
      c.jumlah_unit,
      p.id AS project_id,
      p.nama_proyek,
      cp.nama_pt AS nama_perusahaan
    FROM units u
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    LEFT JOIN companies cp ON cp.id = p.company_id
    WHERE ${scopeCondition}
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
  if (!id) return null;
  let scopeCondition;
  if (['super_admin', 'owner'].includes(userContext.role)) {
    scopeCondition = sql`true`;
  } else if (userContext.role === 'customer') {
    scopeCondition = sql`u.id IN (SELECT unit_id FROM property_assignments WHERE user_id = ${userContext.sub}::uuid)`;
  } else {
    scopeCondition = sql`p.company_id = ${userContext.companyId}::uuid`;
  }

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
      u.image_url,
      u.created_at,
      u.updated_at,
      c.nama_cluster,
      c.jumlah_unit,
      p.id AS project_id,
      p.nama_proyek,
      cp.nama_pt AS nama_perusahaan,
      p.company_id AS company_id,
      cp.kode_pt
    FROM units u
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    LEFT JOIN companies cp ON cp.id = p.company_id
    WHERE u.id = ${id}
      AND ${scopeCondition}
    LIMIT 1
  `);

  if (!rows[0]) return null;

  const unitData = mapUnitRow(rows[0]);

  /**
   * RESOLVE ADMIN PHONE NUMBER FOR WHATSAPP REDIRECTION
   * 
   * When a customer views a unit, they need a WhatsApp button to contact the admin.
   * Instead of maintaining a complex admin mapping table, the system enforces a convention:
   * The primary admin for any company is registered with the email format: admin@[kode_pt].com
   * 
   * We dynamically look up this email to retrieve the active WhatsApp number.
   * Example: Company Code "PRJP" -> looks up "admin@prjp.com".
   */
  let adminPhone = null;
  if (rows[0].kode_pt) {
    const adminEmail = `admin@${rows[0].kode_pt.trim().toLowerCase()}.com`;
    const adminRows = await db.execute(sql`
      SELECT nomor_telepon FROM users WHERE LOWER(email) = LOWER(${adminEmail}) LIMIT 1
    `);
    adminPhone = adminRows[0]?.nomor_telepon || null;
  }

  return {
    ...unitData,
    admin_phone: adminPhone,
  };
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
      progress_percentage,
      image_url
    )
    VALUES (
      ${value.cluster_id},
      ${value.nomor_unit},
      ${value.tipe_rumah},
      ${value.luas_tanah},
      ${value.luas_bangunan},
      ${value.status_pembangunan},
      ${value.progress_percentage},
      ${value.image_url}
    )
    RETURNING id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, image_url, created_at, updated_at
  `);

  return mapUnitRow(rows[0]);
};

export const insertUnits = async (unitsData) => {
  if (!unitsData || unitsData.length === 0) return [];

  const values = unitsData.map(normalizeUnitInput).map(value => ({
    clusterId: value.cluster_id,
    nomorUnit: value.nomor_unit,
    tipeRumah: value.tipe_rumah,
    luasTanah: value.luas_tanah,
    luasBangunan: value.luas_bangunan,
    statusPembangunan: value.status_pembangunan,
    progressPercentage: value.progress_percentage,
    imageUrl: value.image_url
  }));

  const rows = await db.insert(units).values(values).returning();
  
  // map unit rows back to expected shape
  await clearDashboardCache();
  return rows.map(r => mapUnitRow({
    id: r.id,
    cluster_id: r.clusterId,
    nomor_unit: r.nomorUnit,
    tipe_rumah: r.tipeRumah,
    luas_tanah: r.luasTanah,
    luas_bangunan: r.luasBangunan,
    status_pembangunan: r.statusPembangunan,
    progress_percentage: r.progressPercentage,
    image_url: r.imageUrl,
    created_at: r.createdAt,
    updated_at: r.updatedAt
  }));
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
           image_url = COALESCE(${value.image_url ?? null}, image_url),
           updated_at = NOW()
     WHERE id = ${id}
    RETURNING id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, image_url, created_at, updated_at
  `);

  return mapUnitRow(rows[0]);
};

export const deleteUnit = async (id, userContext) => {
  const existing = await findUnitById(id, userContext);
  if (!existing) return null;

  const assignmentRes = await db.execute(sql`SELECT COUNT(*) as count FROM property_assignments WHERE unit_id = ${id}`);
  if (Number(assignmentRes[0].count) > 0) {
    throw new Error("Gagal menghapus Unit. Masih terdapat data Penugasan Pemilik (Assignment). Harap hapus Penugasan terlebih dahulu.");
  }

  const rows = await db.execute(sql`
    DELETE FROM units
     WHERE id = ${id}
    RETURNING id, cluster_id, nomor_unit, tipe_rumah, luas_tanah, luas_bangunan, status_pembangunan, progress_percentage, image_url, created_at, updated_at
  `);

  return mapUnitRow(rows[0]);
};