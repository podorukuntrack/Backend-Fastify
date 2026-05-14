// src/modules/projects/project.service.js
import { db } from "../../config/database.js";
import { projects } from "../../shared/schemas/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { getTenantScope } from "../../shared/utils/scopes.js";

export const getProjects = async (userContext) => {
  const scope = getTenantScope(projects, userContext);
const result = await db
    .select()
    .from(projects)
    .where(eq(projects.companyId, userContext.companyId));
    
  return result.map((project) => ({
    id: project.id,
    nama_proyek: project.namaProyek,
    deskripsi: project.deskripsi,
    lokasi: project.lokasi,
    status: project.status,
    created_at: project.createdAt.toISOString(),
  }));
};

export const getProject = async (id, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope
    ? and(eq(projects.id, id), scope)
    : eq(projects.id, id);

  const result = await db.select().from(projects).where(condition).limit(1);
  if (result.length === 0) throw new Error("Project not found");

  const project = result[0];

  return {
    id: project.id,
    nama_proyek: project.namaProyek,
    deskripsi: project.deskripsi,
    lokasi: project.lokasi,
    status: project.status,
    created_at: project.createdAt.toISOString(),
  };
};

export const createProject = async (data, userContext) => {
  const companyId = data.company_id ?? data.companyId ?? userContext.companyId;

  if (!companyId) {
    const error = new Error("Pilih perusahaan terlebih dahulu untuk membuat proyek");
    error.statusCode = 400;
    throw error;
  }

  const result = await db
    .insert(projects)
    .values({
      namaProyek: data.nama_proyek,
      deskripsi: data.deskripsi,
      lokasi: data.lokasi,
      status: data.status || "active",
      companyId,
      createdBy: userContext.sub,
    })
    .returning();

  return result[0];
};

// Perbaikan fungsi Edit di project.service.js
export const modifyProject = async (id, data, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope
    ? and(eq(projects.id, id), scope)
    : eq(projects.id, id);

  // Mapping Manual: Dari snake_case (frontend) ke camelCase (Drizzle Schema)
  const updateData = {
    namaProyek: data.nama_proyek, // Map secara eksplisit
    deskripsi: data.deskripsi,
    lokasi: data.lokasi,
    status: data.status,
    updatedAt: new Date(),
  };

  // Hilangkan property yang bernilai undefined agar tidak mengupdate NULL secara tidak sengaja
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key],
  );

  const result = await db
    .update(projects)
    .set(updateData) // Gunakan updateData, BUKAN data langsung
    .where(condition)
    .returning();

  // Kembalikan dalam format snake_case agar frontend bisa langsung update UI
  if (!result[0]) return null;

  return {
    id: result[0].id,
    nama_proyek: result[0].namaProyek,
    deskripsi: result[0].deskripsi,
    lokasi: result[0].lokasi,
    status: result[0].status,
    created_at: result[0].createdAt,
  };
};

export const removeProject = async (id, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope
    ? and(eq(projects.id, id), scope)
    : eq(projects.id, id);

  const result = await db.delete(projects).where(condition).returning();
  return result[0];
};

export const getProjectStatistics = async (id, userContext) => {
  const project = await getProject(id, userContext);
  if (!project) return null;

  const statsResult = await db.execute(sql`
    SELECT 
      COUNT(u.id) as total_units,
      SUM(CASE WHEN u.status = 'sold' THEN 1 ELSE 0 END) as sold_units,
      SUM(CASE WHEN u.status = 'available' THEN 1 ELSE 0 END) as available_units
    FROM units u
    JOIN clusters c ON u.cluster_id = c.id
    WHERE c.project_id = ${id}
  `);

  return statsResult[0];
};
