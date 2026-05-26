// src/modules/users/user.repository.js
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

export const findUsers = async (page, limit, userContext, filters = {}) => {
  const offset = (page - 1) * limit;
  const search = filters.search?.trim() ?? '';
  const roleFilter = filters.role ?? null;
  const allCustomers = filters.all_customers ?? false;

  let conditionSql;

  if (userContext.role === 'super_admin') {
    // Super admin bisa lihat semua
    conditionSql = sql`true`;

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
    // 1. Ambil semua unit dan assignment yang terhubung ke customer ini
    const assignmentsRes = await db.execute(sql`
      SELECT id AS assignment_id, unit_id
      FROM property_assignments
      WHERE user_id = ${id}
    `);
    
    if (assignmentsRes.length > 0) {
      const unitIds = assignmentsRes.map(a => a.unit_id);
      const assignmentIds = assignmentsRes.map(a => a.assignment_id);

      // 2. Hapus data yang terhubung dengan unit_id
      if (unitIds.length > 0) {
        // Hapus documentations (baik foto progress maupun lain-lain)
        await db.execute(sql`DELETE FROM documentations WHERE unit_id = ANY(${unitIds}::uuid[])`);
        // Hapus retentions
        await db.execute(sql`DELETE FROM retentions WHERE unit_id = ANY(${unitIds}::uuid[])`);
        // Hapus handover defects & handovers
        await db.execute(sql`
          DELETE FROM handover_defects 
          WHERE handover_id IN (SELECT id FROM handovers WHERE unit_id = ANY(${unitIds}::uuid[]))
        `);
        await db.execute(sql`DELETE FROM handovers WHERE unit_id = ANY(${unitIds}::uuid[])`);
        // Hapus progress
        await db.execute(sql`DELETE FROM progress WHERE unit_id = ANY(${unitIds}::uuid[])`);
        // Hapus timelines
        await db.execute(sql`DELETE FROM timelines WHERE unit_id = ANY(${unitIds}::uuid[])`);
        // Reset status unit
        await db.execute(sql`
          UPDATE units 
          SET progress_percentage = 0, status_pembangunan = 'planned' 
          WHERE id = ANY(${unitIds}::uuid[])
        `);
      }

      // 3. Hapus data yang terhubung dengan assignment_id
      if (assignmentIds.length > 0) {
        await db.execute(sql`DELETE FROM payment_history WHERE assignment_id = ANY(${assignmentIds}::uuid[])`);
      }
      
      // Hapus assignments
      await db.execute(sql`DELETE FROM property_assignments WHERE user_id = ${id}`);
    }

    // 4. Hapus data personal customer
    await db.execute(sql`DELETE FROM user_devices WHERE user_id = ${id}`);
    await db.execute(sql`
      DELETE FROM ticket_messages 
      WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id = ${id})
    `);
    await db.execute(sql`DELETE FROM tickets WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM whatsapp_logs WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${id}`);
  } else {
    // Jika admin/staff, bersihkan saja token dan devices (jika ada)
    await db.execute(sql`DELETE FROM user_devices WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${id}`);
  }

  // 5. Terakhir hapus usernya
  const result = await db.execute(sql`
    DELETE FROM users
     WHERE id = ${id}
    RETURNING id
  `);

  return result[0];
};
