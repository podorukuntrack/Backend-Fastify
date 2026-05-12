import { db } from '../../config/database.js';
import { projects } from '../../shared/schemas/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findAllProjects = async (userContext) => {
  const scope = getTenantScope(projects, userContext);
  return await db.select().from(projects).where(scope);
};

export const findProjectById = async (id, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope ? and(eq(projects.id, id), scope) : eq(projects.id, id);
  
  const result = await db.select().from(projects).where(condition).limit(1);
  return result[0];
};

export const insertProject = async (data) => {
  const result = await db.insert(projects).values(data).returning();
  return result[0];
};

export const updateProject = async (id, data, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope ? and(eq(projects.id, id), scope) : eq(projects.id, id);

  data.updatedAt = new Date();
  const result = await db.update(projects).set(data).where(condition).returning();
  return result[0];
};

export const deleteProject = async (id, userContext) => {
  const scope = getTenantScope(projects, userContext);
  const condition = scope ? and(eq(projects.id, id), scope) : eq(projects.id, id);

  const result = await db.delete(projects).where(condition).returning();
  return result[0];
};

export const getProjectStats = async (id, userContext) => {
  // Verifikasi apakah project ada dan user berhak mengaksesnya
  const project = await findProjectById(id, userContext);
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