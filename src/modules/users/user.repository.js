// src/modules/users/user.repository.js
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

export const findUsers = async (page, limit, userContext, filters = {}) => {
  const offset = (page - 1) * limit;
  const search = filters.search?.trim() ?? '';
  const roleFilter = filters.role ?? null;

  let conditionSql;

  if (userContext.role === 'super_admin') {
    // Super admin hanya lihat admin
    conditionSql = sql`u.role = 'admin'`;

  } else if (userContext.role === 'admin') {
    // Admin bisa lihat semua customer (meskipun company_id null)
    // dan admin lain dengan company_id sama
    conditionSql = sql`(
    (u.role = 'customer' AND u.company_id = ${userContext.companyId}::uuid)
    OR (u.role = 'admin' AND u.company_id = ${userContext.companyId}::uuid)
  )`

  } else if (userContext.role === 'customer') {
    // Customer hanya bisa lihat dirinya sendiri
    conditionSql = sql`u.id = ${userContext.sub}::uuid`;

  } else {
    // Default: tidak ada akses
    conditionSql = sql`false`;
  }

  const data = await db.execute(sql`
    SELECT
      u.id,
      u.company_id,
      u.nama,
      u.email,
      u.nomor_telepon,
      u.role,
      u.status,
      u.created_at,
      u.updated_at
    FROM users u
    WHERE ${conditionSql}
      AND (${search} = '' OR u.nama ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
      AND (${roleFilter}::user_role IS NULL OR u.role = ${roleFilter}::user_role)
    ORDER BY u.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const totalRes = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM users u
    WHERE ${conditionSql}
      AND (${search} = '' OR u.nama ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
      AND (${roleFilter}::user_role IS NULL OR u.role = ${roleFilter}::user_role)
  `);

  const total = Number(totalRes[0].count);
  return { data, total };
};


export const findUserById = async (id, userContext) => {
  let conditionSql;

  if (userContext.role === 'super_admin') {
    // Super admin hanya bisa lihat admin
    conditionSql = sql`id = ${id} AND role = 'admin'`;

  } else if (userContext.role === 'admin') {
    // Admin bisa lihat customer (tanpa company_id)
    // atau admin lain dengan company_id sama
      conditionSql = sql`id = ${id} AND (
    (role = 'customer' AND company_id = ${userContext.companyId}::uuid)
    OR (role = 'admin' AND company_id = ${userContext.companyId}::uuid)
  )`;

  } else if (userContext.role === 'customer') {
    // Customer hanya bisa lihat dirinya sendiri
    conditionSql = sql`id = ${id} AND id = ${userContext.sub}::uuid`;

  } else {
    // Default: tidak ada akses
    conditionSql = sql`false`;
  }

  const result = await db.execute(sql`
    SELECT id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
    FROM users
    WHERE ${conditionSql}
    LIMIT 1
  `);

  return result[0];
};


export const insertUser = async (data) => {
  const result = await db.execute(sql`
    INSERT INTO users (company_id, nama, email, password_hash, nomor_telepon, role, status)
    VALUES (${data.company_id ?? null}, ${data.nama}, ${data.email}, ${data.password_hash}, ${data.nomor_telepon ?? null}, ${data.role}, ${data.status ?? 'active'})
    RETURNING id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
  `);
  return result[0];
};

export const updateUser = async (id, data, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;
  const result = await db.execute(sql`
    UPDATE users
       SET company_id = COALESCE(${data.company_id ?? null}, company_id),
           nama = COALESCE(${data.nama ?? null}, nama),
           email = COALESCE(${data.email ?? null}, email),
           password_hash = COALESCE(${data.password_hash ?? null}, password_hash),
           nomor_telepon = COALESCE(${data.nomor_telepon ?? null}, nomor_telepon),
           role = COALESCE(${data.role ?? null}, role),
           status = COALESCE(${data.status ?? null}, status),
           updated_at = NOW()
     WHERE id = ${id}
       AND (${companyId}::uuid IS NULL OR company_id = ${companyId}::uuid)
    RETURNING id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
  `);
  return result[0];
};

export const deleteUser = async (id, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;
  const result = await db.execute(sql`
    DELETE FROM users
     WHERE id = ${id}
       AND (${companyId}::uuid IS NULL OR company_id = ${companyId}::uuid)
    RETURNING id
  `);
  return result[0];
};
