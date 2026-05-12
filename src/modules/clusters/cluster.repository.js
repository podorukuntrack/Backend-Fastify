import { db } from '../../config/database.js';
import { clusters } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findAllClusters = async (userContext) => {
  const scope = getTenantScope(clusters, userContext);
  return await db.select().from(clusters).where(scope);
};

export const findClusterById = async (id, userContext) => {
  const scope = getTenantScope(clusters, userContext);
  const condition = scope ? and(eq(clusters.id, id), scope) : eq(clusters.id, id);
  
  const result = await db.select().from(clusters).where(condition).limit(1);
  return result[0];
};

export const insertCluster = async (data) => {
  const result = await db.insert(clusters).values(data).returning();
  return result[0];
};

export const updateCluster = async (id, data, userContext) => {
  const scope = getTenantScope(clusters, userContext);
  const condition = scope ? and(eq(clusters.id, id), scope) : eq(clusters.id, id);

  data.updatedAt = new Date();
  const result = await db.update(clusters).set(data).where(condition).returning();
  return result[0];
};

export const deleteCluster = async (id, userContext) => {
  const scope = getTenantScope(clusters, userContext);
  const condition = scope ? and(eq(clusters.id, id), scope) : eq(clusters.id, id);

  const result = await db.delete(clusters).where(condition).returning();
  return result[0];
};