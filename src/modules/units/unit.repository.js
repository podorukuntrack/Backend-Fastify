import { db } from '../../config/database.js';
import { units, clusters, projects, users } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findAllUnits = async (userContext) => {
  const scope = getTenantScope(units, userContext);
  return await db.select().from(units).where(scope);
};

export const findUnitById = async (id, userContext) => {
  const scope = getTenantScope(units, userContext);
  const condition = scope ? and(eq(units.id, id), scope) : eq(units.id, id);
  
  const result = await db.select().from(units).where(condition).limit(1);
  return result[0];
};

export const findUnitDetailById = async (id, userContext) => {
  const scope = getTenantScope(units, userContext);
  const condition = scope ? and(eq(units.id, id), scope) : eq(units.id, id);

  const result = await db.select({
    id: units.id,
    block: units.block,
    number: units.number,
    price: units.price,
    status: units.status,
    cluster: {
      id: clusters.id,
      name: clusters.name
    },
    project: {
      id: projects.id,
      name: projects.name,
      location: projects.location
    },
    customer: {
      id: users.id,
      name: users.name,
      email: users.email
    }
  })
  .from(units)
  .innerJoin(clusters, eq(units.clusterId, clusters.id))
  .innerJoin(projects, eq(clusters.projectId, projects.id))
  .leftJoin(users, eq(units.userId, users.id)) // Menggunakan left join karena userId bisa jadi null
  .where(condition)
  .limit(1);

  return result[0];
};

export const insertUnit = async (data) => {
  const result = await db.insert(units).values(data).returning();
  return result[0];
};

export const updateUnit = async (id, data, userContext) => {
  const scope = getTenantScope(units, userContext);
  const condition = scope ? and(eq(units.id, id), scope) : eq(units.id, id);

  data.updatedAt = new Date();
  const result = await db.update(units).set(data).where(condition).returning();
  return result[0];
};

export const deleteUnit = async (id, userContext) => {
  const scope = getTenantScope(units, userContext);
  const condition = scope ? and(eq(units.id, id), scope) : eq(units.id, id);

  const result = await db.delete(units).where(condition).returning();
  return result[0];
};