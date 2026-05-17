// src/shared/utils/scopes.js

import { eq, sql } from 'drizzle-orm';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Menghasilkan kondisi WHERE berdasarkan role user.
 * - super_admin: melihat semua data
 * - admin / cs: melihat data dalam perusahaannya
 * - customer: hanya melihat data miliknya sendiri
 */
export const getTenantScope = (
  table,
  user,
) => {
  if (!user || !user.role) {
    return sql`false`;
  }

  // SUPER ADMIN
  if (
    user.role === 'super_admin'
  ) {
    return undefined;
  }

  // CUSTOMER
  if (
    user.role === 'customer'
  ) {
    const userId = user.sub || user.id;
    const isValidUserId = userId && UUID_REGEX.test(userId);

    if (!isValidUserId) {
      return sql`false`;
    }

    // Jika tabel punya userId
    // maka filter berdasarkan user login
    if (table.userId) {
      return eq(
        table.userId,
        userId,
      );
    }

    // Jika tabel punya unitId
    // maka filter berdasarkan unit yang diassign ke customer
    if (table.unitId) {
      return sql`${table.unitId} IN (
        SELECT unit_id FROM property_assignments WHERE user_id = ${userId}::uuid
      )`;
    }

    // Projects table check
    if (table.namaProyek) {
      return sql`${table.id} IN (
        SELECT c.project_id 
        FROM property_assignments pa
        JOIN units un ON un.id = pa.unit_id
        JOIN clusters c ON c.id = un.cluster_id
        WHERE pa.user_id = ${userId}::uuid
      )`;
    }

    // Clusters table check
    if (table.namaCluster) {
      return sql`${table.id} IN (
        SELECT un.cluster_id 
        FROM property_assignments pa
        JOIN units un ON un.id = pa.unit_id
        WHERE pa.user_id = ${userId}::uuid
      )`;
    }

    // Jika customer belum punya companyId atau table tidak punya companyId, return undefined
    if (!user.companyId || !table.companyId) {
      return undefined;
    }

    // Fallback ke companyId
    return eq(
      table.companyId,
      user.companyId,
    );
  }

  // ADMIN & CS
  if (!user.companyId || !table.companyId) {
    return undefined;
  }

  return eq(
    table.companyId,
    user.companyId,
  );
};