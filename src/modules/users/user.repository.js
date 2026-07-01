// src/modules/users/user.repository.js
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

export const findUsers = async (page, limit, userContext, filters = {}) => {
  const offset = (page - 1) * limit;
  const search = filters.search?.trim() ?? '';
  const roleFilter = filters.role ?? null;
  const allCustomers = filters.all_customers ?? false;

  let conditionSql;

  if (userContext.role === 'super_admin') {
    // Super admin cukup melihat akun admin/non-customer
    conditionSql = sql`u.role != 'customer'`;

  } else if (userContext.role === 'admin') {
    if (allCustomers) {
      // Admin request all customers for assignment: return ALL users with role = 'customer'
      conditionSql = sql`u.role = 'customer'`;
    } else {
      // Normal admin view: non-customer dari company yg sama, atau customer dari company yg sama, atau customer yg diassign ke company admin
      conditionSql = sql`(
        u.company_id = ${userContext.companyId}::uuid
        OR
        (u.role = 'customer' AND EXISTS (
          SELECT 1 
          FROM property_assignments pa
          JOIN units un ON un.id = pa.unit_id
          JOIN clusters cl ON cl.id = un.cluster_id
          JOIN projects pr ON pr.id = cl.project_id
          WHERE pa.user_id = u.id 
            AND pr.company_id = ${userContext.companyId}::uuid
        ))
      )`;
    }

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
      AND u.id != ${userContext.sub}::uuid
      AND (${search} = '' OR u.nama ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
      AND (${roleFilter}::user_role IS NULL OR u.role = ${roleFilter}::user_role)
    ORDER BY u.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  fs.appendFileSync('d:\\Podorukuntrack\\backend\\debug.log', JSON.stringify({
    timestamp: new Date(),
    role: userContext.role,
    search, roleFilter, allCustomers,
    resultCount: data.length
  }) + '\n');

  const totalRes = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM users u
    WHERE ${conditionSql}
      AND u.id != ${userContext.sub}::uuid
      AND (${search} = '' OR u.nama ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
      AND (${roleFilter}::user_role IS NULL OR u.role = ${roleFilter}::user_role)
  `);

  const total = Number(totalRes[0].count);
  return { data, total };
};


export const findUserById = async (id, userContext) => {
  let conditionSql;

  if (userContext.role === 'super_admin') {
    // Super admin bisa lihat semua
    conditionSql = sql`id = ${id}`;

  } else if (userContext.role === 'admin') {
    // Admin bisa lihat semua akun yg ada di company-nya,
    // atau customer yang memiliki unit di perusahaannya
    conditionSql = sql`id = ${id} AND (
      company_id = ${userContext.companyId}::uuid
      OR
      (role = 'customer' AND EXISTS (
        SELECT 1 
        FROM property_assignments pa
        JOIN units un ON un.id = pa.unit_id
        JOIN clusters cl ON cl.id = un.cluster_id
        JOIN projects pr ON pr.id = cl.project_id
        WHERE pa.user_id = users.id 
          AND pr.company_id = ${userContext.companyId}::uuid
      ))
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
  const companyId = data.role === 'customer' ? null : (data.company_id ?? null);
  const result = await db.execute(sql`
    INSERT INTO users (company_id, nama, email, password_hash, nomor_telepon, role, status)
    VALUES (${companyId}, ${data.nama}, ${data.email}, ${data.password_hash}, ${data.nomor_telepon ?? null}, ${data.role}, ${data.status ?? 'active'})
    RETURNING id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
  `);
  return result[0];
};

export const updateUser = async (id, data, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;
  const result = await db.execute(sql`
    UPDATE users
       SET company_id = CASE 
             WHEN COALESCE(${data.role ?? null}, role) = 'customer' THEN NULL 
             ELSE COALESCE(${data.company_id ?? null}, company_id)
           END,
           nama = COALESCE(${data.nama ?? null}, nama),
           email = COALESCE(${data.email ?? null}, email),
           password_hash = COALESCE(${data.password_hash ?? null}, password_hash),
           nomor_telepon = COALESCE(${data.nomor_telepon ?? null}, nomor_telepon),
           role = COALESCE(${data.role ?? null}, role),
           status = COALESCE(${data.status ?? null}, status),
           updated_at = NOW()
     WHERE id = ${id}
       AND (
         ${companyId}::uuid IS NULL 
         OR (role != 'customer' AND company_id = ${companyId}::uuid)
         OR (role = 'customer' AND EXISTS (
           SELECT 1 
           FROM property_assignments pa
           JOIN units un ON un.id = pa.unit_id
           JOIN clusters cl ON cl.id = un.cluster_id
           JOIN projects pr ON pr.id = cl.project_id
           WHERE pa.user_id = users.id 
             AND pr.company_id = ${companyId}::uuid
         ))
       )
    RETURNING id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
  `);
  return result[0];
};

export const deleteUser = async (id, userContext) => {
  const companyId = userContext.role === 'super_admin' ? null : userContext.companyId;

  // Cek apakah user yang mau dihapus ada dan bisa diakses
  const existing = await findUserById(id, userContext);
  if (!existing) return null;

  if (existing.role === 'customer') {
    const tryDelete = async (query) => {
      try {
        await db.execute(query);
      } catch (err) {
        const pgErrorCode = err.code || (err.cause && err.cause.code);
        // 42P01 = undefined_table (relation does not exist)
        // 22P02 = invalid_text_representation (invalid enum value, etc)
        if (pgErrorCode !== '42P01' && pgErrorCode !== '22P02') throw err; 
      }
    };

    // 1. Ambil ID unit dan assignment
    const assignmentsRes = await db.execute(sql`
      SELECT id AS assignment_id, unit_id
      FROM property_assignments
      WHERE user_id = ${id}
    `);

    if (assignmentsRes.length > 0) {
      const unitIds = assignmentsRes.map(a => a.unit_id).filter(Boolean);
      const assignmentIds = assignmentsRes.map(a => a.assignment_id).filter(Boolean);

      if (unitIds.length > 0 || assignmentIds.length > 0) {
        const unitIdsSql = unitIds.length > 0 ? unitIds.map(u => `'${u}'`).join(', ') : "'00000000-0000-0000-0000-000000000000'";
        const assignmentIdsSql = assignmentIds.length > 0 ? assignmentIds.map(u => `'${u}'`).join(', ') : "'00000000-0000-0000-0000-000000000000'";

        // Hapus data yang terhubung dengan assignment_id
        await tryDelete(sql.raw(`DELETE FROM payment_history WHERE assignment_id IN (${assignmentIdsSql})`));

        // Hapus data yang terhubung dengan unit_id
        await tryDelete(sql.raw(`DELETE FROM documentation WHERE unit_id IN (${unitIdsSql})`));
        await tryDelete(sql.raw(`DELETE FROM retentions WHERE unit_id IN (${unitIdsSql})`));
        
        await tryDelete(sql.raw(`
          DELETE FROM handover_defects 
          WHERE handover_id IN (SELECT id FROM handovers WHERE unit_id IN (${unitIdsSql}))
        `));
        
        await tryDelete(sql.raw(`DELETE FROM handovers WHERE unit_id IN (${unitIdsSql})`));
        await tryDelete(sql.raw(`DELETE FROM progress WHERE unit_id IN (${unitIdsSql})`));
        await tryDelete(sql.raw(`DELETE FROM timelines WHERE unit_id IN (${unitIdsSql})`));

        // Hapus assignments SEBELUM hapus units
        await tryDelete(sql.raw(`DELETE FROM property_assignments WHERE id IN (${assignmentIdsSql})`));

        // Terakhir hapus unitnya
        await tryDelete(sql.raw(`DELETE FROM units WHERE id IN (${unitIdsSql})`));
      }
    }

    // 4. Hapus data personal customer
    await tryDelete(sql`DELETE FROM user_devices WHERE user_id = ${id}`);
    await tryDelete(sql`
      DELETE FROM ticket_messages 
      WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id = ${id})
    `);
    await tryDelete(sql`DELETE FROM tickets WHERE user_id = ${id}`);
    await tryDelete(sql`DELETE FROM whatsapp_logs WHERE user_id = ${id}`);
    await tryDelete(sql`DELETE FROM refresh_tokens WHERE user_id = ${id}`);
  } else {
    // Jika admin/staff, bersihkan saja token dan devices (jika ada)
    await Promise.all([
      db.execute(sql`DELETE FROM user_devices WHERE user_id = ${id}`),
      db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${id}`)
    ]);
  }

  // 5. Terakhir hapus usernya
  const result = await db.execute(sql`
    DELETE FROM users
     WHERE id = ${id}
    RETURNING id
  `);

  return result[0];
};
