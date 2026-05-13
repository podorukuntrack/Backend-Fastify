import { db } from "../../config/database.js";
import { projects } from "../../shared/schemas/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { getTenantScope } from "../../shared/utils/scopes.js";

export const getProjects = async (userContext) => {
  const scope = getTenantScope(projects, userContext);
  const result = await db.select().from(projects).where(scope);

  // Ubah output dari Drizzle agar sesuai dengan Fastify Response Schema
  return result.map((project) => ({
    id: project.id,
    name: project.namaProyek,        // Map ke 'name'
    description: project.deskripsi,  // Map ke 'description'
    status: project.status,
    createdAt: project.createdAt.toISOString() // Amankan format tanggal
  }));
};

export const getProject = async (id, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope ? and(eq(projects.id, id), scope) : eq(projects.id, id);
  
  const result = await db.select().from(projects).where(condition).limit(1);
  if (result.length === 0) throw new Error('Project not found');

  const project = result[0];
  
  // Ubah output dari Drizzle
  return {
    id: project.id,
    name: project.namaProyek,
    description: project.deskripsi,
    status: project.status,
    createdAt: project.createdAt.toISOString()
  };
};

export const createProject = async (data, userContext) => {
  const result = await db
    .insert(projects)
    .values({
      namaProyek: data.nama_proyek, // Map request body to schema key
      deskripsi: data.deskripsi,
      lokasi: data.lokasi,
      status: data.status || "active",
      companyId: userContext.companyId, // Gunakan camelCase sesuai log
      createdBy: userContext.sub,
    })
    .returning();

  return result[0];
};

export const modifyProject = async (id, data, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope
    ? and(eq(projects.id, id), scope)
    : eq(projects.id, id);

  data.updatedAt = new Date();
  const result = await db
    .update(projects)
    .set(data)
    .where(condition)
    .returning();
  return result[0];
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
  // Verifikasi apakah project ada dan user berhak mengaksesnya
  const project = await getProject(id, userContext);
  if (!project) return null;

  // Raw query untuk mengambil statistik dari tabel units dan clusters
  const statsResult = await db.execute(sql`
    SELECT 
      COUNT(u.id) as total_units,
      SUM(CASE WHEN u.status = 'sold' THEN 1 ELSE 0 END) as sold_units,
      SUM(CASE WHEN u.status = 'available' THEN 1 ELSE 0 END) as available_units
    FROM units u
    JOIN clusters c ON u.cluster_id = c.id
    WHERE c.project_id = ${id} AND u.company_id = ${project.companyId}
  `);

  return statsResult[0];
};
