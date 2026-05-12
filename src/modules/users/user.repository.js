// src/modules/users/user.repository.js
import { db } from '../../config/database.js';
import { users } from '../../shared/schemas/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js'; // <-- Sudah diganti ke getTenantScope

export const findUsers = async (page, limit, userContext) => {
  const offset = (page - 1) * limit;
  const scope = getTenantScope(users, userContext); // <-- Sudah diganti

  // Ambil data tanpa mengikutsertakan password
  const data = await db.select({
    id: users.id,
    companyId: users.companyId,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
  })
  .from(users)
  .where(scope)
  .limit(limit)
  .offset(offset);

  // Ambil total data untuk metadata pagination
  const totalRes = await db.select({ count: sql`count(*)` }).from(users).where(scope);
  const total = Number(totalRes[0].count);

  return { data, total };
};

export const findUserById = async (id, userContext) => {
  const scope = getTenantScope(users, userContext); // <-- Sudah diganti
  const condition = scope ? and(eq(users.id, id), scope) : eq(users.id, id);

  const result = await db.select({
    id: users.id,
    companyId: users.companyId,
    name: users.name,
    email: users.email,
    role: users.role,
  }).from(users).where(condition).limit(1);

  return result[0];
};

export const insertUser = async (data) => {
  const result = await db.insert(users).values(data).returning({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role
  });
  return result[0];
};

export const updateUser = async (id, data, userContext) => {
  const scope = getTenantScope(users, userContext); // <-- Sudah diganti
  const condition = scope ? and(eq(users.id, id), scope) : eq(users.id, id);

  data.updatedAt = new Date();
  const result = await db.update(users).set(data).where(condition).returning({
    id: users.id,
    name: users.name,
    role: users.role
  });
  return result[0];
};

export const deleteUser = async (id, userContext) => {
  const scope = getTenantScope(users, userContext); // <-- Sudah diganti
  const condition = scope ? and(eq(users.id, id), scope) : eq(users.id, id);

  const result = await db.delete(users).where(condition).returning({ id: users.id });
  return result[0];
};