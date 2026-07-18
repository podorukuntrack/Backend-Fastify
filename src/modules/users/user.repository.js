// src/modules/users/user.repository.js
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';


export const findUsers = async (page, limit, userContext, filters = {}) => {
  const offset = (page - 1) * limit;
  const search = filters.search?.trim() ?? '';
  const roleFilter = filters.role ?? null;
  const allCustomers = filters.all_customers ?? false;

  let conditionSql;

  if (['super_admin', 'owner'].includes(userContext.role)) {
    // Super admin melihat semua akun kecuali customer
    conditionSql = sql`u.role != 'customer'`;

  } else if (['admin', 'direksi'].includes(userContext.role)) {
    if (allCustomers) {
      // Admin request all customers for assignment: return ALL users with role = 'customer'
      conditionSql = sql`u.role = 'customer'`;
    } else {
      // Normal admin view: hanya customer dari company yg sama, atau customer yg diassign ke company admin
      conditionSql = sql`u.role = 'customer' AND (
        u.company_id = ${userContext.companyId}::uuid
        OR EXISTS (
          SELECT 1 
          FROM property_assignments pa
          JOIN units un ON un.id = pa.unit_id
          JOIN clusters cl ON cl.id = un.cluster_id
          JOIN projects pr ON pr.id = cl.project_id
          WHERE pa.user_id = u.id 
            AND pr.company_id = ${userContext.companyId}::uuid
        )
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
      AND (${userContext.role} = 'super_admin' OR u.id != ${userContext.sub}::uuid)
      AND u.nama != 'Pengguna Terhapus'
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
      AND (${userContext.role} = 'super_admin' OR u.id != ${userContext.sub}::uuid)
      AND u.nama != 'Pengguna Terhapus'
      AND (${search} = '' OR u.nama ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})
      AND (${roleFilter}::user_role IS NULL OR u.role = ${roleFilter}::user_role)
  `);

  const total = Number(totalRes[0].count);
  return { data, total };
};


export const findUserById = async (id, userContext) => {
  let conditionSql;

  if (['super_admin', 'owner'].includes(userContext.role)) {
    // Super admin bisa lihat semua
    conditionSql = sql`id = ${id}`;

  } else if (['admin', 'direksi'].includes(userContext.role)) {
    // Admin/direksi hanya bisa lihat customer di company-nya atau dirinya sendiri
    conditionSql = sql`id = ${id} AND (
      id = ${userContext.sub}::uuid
      OR
      (role = 'customer' AND (
        company_id = ${userContext.companyId}::uuid
        OR EXISTS (
          SELECT 1 
          FROM property_assignments pa
          JOIN units un ON un.id = pa.unit_id
          JOIN clusters cl ON cl.id = un.cluster_id
          JOIN projects pr ON pr.id = cl.project_id
          WHERE pa.user_id = users.id 
            AND pr.company_id = ${userContext.companyId}::uuid
        )
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
  const companyId = ['customer', 'super_admin', 'owner'].includes(data.role) ? null : (data.company_id ?? null);
  const result = await db.execute(sql`
    INSERT INTO users (company_id, nama, email, password_hash, nomor_telepon, role, status)
    VALUES (${companyId}, ${data.nama ?? null}, ${data.email ?? null}, ${data.password_hash ?? null}, ${data.nomor_telepon ?? null}, ${data.role ?? null}, ${data.status ?? 'active'})
    RETURNING id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
  `);
  return result[0];
};

export const updateUser = async (id, data, userContext) => {
  const companyId = ['super_admin', 'owner'].includes(userContext.role) ? null : userContext.companyId;
  const result = await db.execute(sql`
    UPDATE users
       SET company_id = CASE 
             WHEN COALESCE(${data.role ?? null}, role) IN ('customer', 'super_admin', 'owner') THEN NULL 
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
         OR id = ${userContext.sub}::uuid
         OR (role = 'customer' AND (
           company_id = ${companyId}::uuid
           OR EXISTS (
             SELECT 1 
             FROM property_assignments pa
             JOIN units un ON un.id = pa.unit_id
             JOIN clusters cl ON cl.id = un.cluster_id
             JOIN projects pr ON pr.id = cl.project_id
             WHERE pa.user_id = users.id 
               AND pr.company_id = ${companyId}::uuid
           )
         ))
       )
    RETURNING id, company_id, nama, email, nomor_telepon, role, status, created_at, updated_at
  `);
  return result[0];
};

/**
 * Deletes a user account with manual relational integrity checks.
 * 
 * WHY NOT CASCADE DELETE?
 * We enforce manual checks (soft-blocks) rather than database-level CASCADE DELETE 
 * to protect historical business data (like payments, handovers, and tickets) 
 * from being accidentally wiped out if an admin hastily deletes a customer account.
 * The system forces the admin to acknowledge and manually clear these records first.
 */
export const deleteUser = async (id, userContext) => {
  const companyId = ['super_admin', 'owner'].includes(userContext.role) ? null : userContext.companyId;

  // Cek apakah user yang mau dihapus ada dan bisa diakses
  const existing = await findUserById(id, userContext);
  if (!existing) throw new Error('User tidak ditemukan atau tidak ada akses');

  if (existing.role === 'customer') {
    // 1. Cek Data Protes / Tiket
    const [{ hasTickets }] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM tickets WHERE user_id = ${id}) AS "hasTickets"`);
    if (hasTickets) throw new Error('Tidak dapat menghapus akun: Harap hapus data Protes/Tiket untuk pengguna ini terlebih dahulu.');

    // 2. Ambil ID Unit untuk pengecekan selanjutnya
    const assignmentsRes = await db.execute(sql`SELECT id AS assignment_id, unit_id FROM property_assignments WHERE user_id = ${id}`);
    const unitIds = assignmentsRes.map(a => a.unit_id).filter(Boolean);
    const assignmentIds = assignmentsRes.map(a => a.assignment_id).filter(Boolean);

    if (unitIds.length > 0) {
      const unitIdsArray = `{${unitIds.join(',')}}`;
      
      // 3. Cek Retensi
      const [{ hasRetentions }] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM retentions WHERE unit_id = ANY(${unitIdsArray}::uuid[])) AS "hasRetentions"`);
      if (hasRetentions) throw new Error('Tidak dapat menghapus akun: Harap hapus data Retensi untuk pengguna ini terlebih dahulu.');

      // 4. Cek Serah Terima (Handovers)
      const [{ hasHandovers }] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM handovers WHERE unit_id = ANY(${unitIdsArray}::uuid[])) AS "hasHandovers"`);
      if (hasHandovers) throw new Error('Tidak dapat menghapus akun: Harap hapus data Serah Terima untuk pengguna ini terlebih dahulu.');

      // 5. Cek Pembayaran
      const assignmentIdsArray = assignmentIds.length > 0 ? `{${assignmentIds.join(',')}}` : '{}';
      const [{ hasPayments }] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM payment_history WHERE assignment_id = ANY(${assignmentIdsArray}::uuid[])) AS "hasPayments"`);
      if (hasPayments) throw new Error('Tidak dapat menghapus akun: Harap hapus data Pembayaran untuk pengguna ini terlebih dahulu.');
      
      const [{ hasPaymentsMain }] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM payments WHERE unit_id = ANY(${unitIdsArray}::uuid[])) AS "hasPaymentsMain"`);
      if (hasPaymentsMain) throw new Error('Tidak dapat menghapus akun: Harap hapus data Pembayaran (Tagihan) untuk pengguna ini terlebih dahulu.');

      // 6. Cek Progress Pembangunan
      const [{ hasProgress }] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM progress WHERE unit_id = ANY(${unitIdsArray}::uuid[])) AS "hasProgress"`);
      if (hasProgress) throw new Error('Tidak dapat menghapus akun: Harap hapus data Progress Pembangunan untuk pengguna ini terlebih dahulu.');

      // 7. Cek Timeline
      const [{ hasTimeline }] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM timelines WHERE unit_id = ANY(${unitIdsArray}::uuid[])) AS "hasTimeline"`);
      if (hasTimeline) throw new Error('Tidak dapat menghapus akun: Harap hapus data Timeline untuk pengguna ini terlebih dahulu.');
    }

    if (assignmentIds.length > 0) {
      // 8. Cek Assignment
      throw new Error('Tidak dapat menghapus akun: Harap hapus atau batalkan Assignment (Penugasan Unit) untuk pengguna ini terlebih dahulu.');
    }

    // Jika sampai di sini, semua bersih. Hapus data personal yang tidak perlu validasi UI.
    await db.execute(sql`DELETE FROM user_devices WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM whatsapp_logs WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${id}`);
  } else {
    // Jika admin/staff, bersihkan token dan devices (jika ada)
    await Promise.all([
      db.execute(sql`DELETE FROM user_devices WHERE user_id = ${id}`),
      db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${id}`)
    ]);
  }

  // 9. Terakhir hapus usernya
  const result = await db.execute(sql`
    DELETE FROM users
     WHERE id = ${id}
    RETURNING id
  `);

  return result[0];
};
