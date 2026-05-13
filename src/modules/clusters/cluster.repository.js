import { db } from "../../config/database.js";
import { clusters, projects } from "../../shared/schemas/schema.js"; // ✅ import projects
import { eq, and, ilike } from "drizzle-orm";

export const findAllClusters = async (userContext) => {
  return await db
    .select()                                               // ✅ tanpa argumen
    .from(clusters)
    .innerJoin(projects, eq(clusters.projectId, projects.id))
    .where(eq(projects.companyId, userContext.companyId)); // ✅ filter via projects
};

export const findClusterById = async (id, userContext) => {
  const result = await db
    .select()
    .from(clusters)
    .innerJoin(projects, eq(clusters.projectId, projects.id))
    .where(
      and(
        eq(clusters.id, id),
        eq(projects.companyId, userContext.companyId)
      )
    )
    .limit(1);
  return result[0]?.clusters ?? null;
};

export const insertCluster = async (data) => {
  const result = await db.insert(clusters).values(data).returning();
  return result[0];
};

export const updateCluster = async (id, data, userContext) => {
  // Verifikasi ownership dulu via join
  const existing = await findClusterById(id, userContext);
  if (!existing) return null;

  data.updatedAt = new Date();
  const result = await db
    .update(clusters)
    .set(data)
    .where(eq(clusters.id, id))
    .returning();
  return result[0];
};

export const deleteCluster = async (id, userContext) => {
  const existing = await findClusterById(id, userContext);
  if (!existing) return null;

  const result = await db
    .delete(clusters)
    .where(eq(clusters.id, id))
    .returning();
  return result[0];
};