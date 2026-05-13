// src/shared/utils/scopes.js

import { eq } from 'drizzle-orm';

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

    // Jika tabel punya userId
    // maka filter berdasarkan user login

    if (table.userId) {

      return eq(
        table.userId,
        user.sub,
      );
    }

    // Jika customer belum punya companyId
    // jangan bikin query error

    if (!user.companyId) {

      return undefined;
    }

    // Fallback ke companyId

    return eq(
      table.companyId,
      user.companyId,
    );
  }

  // ADMIN & CS

  if (!user.companyId) {

    return undefined;
  }

  return eq(
    table.companyId,
    user.companyId,
  );
};