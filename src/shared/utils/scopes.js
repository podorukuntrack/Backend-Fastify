// src/shared/utils/scopes.js
import { eq, and } from 'drizzle-orm';

/**
 * Menghasilkan kondisi WHERE berdasarkan role user.
 * - super_admin: melihat semua data
 * - admin / cs: melihat data dalam perusahaannya
 * - customer: hanya melihat data miliknya sendiri
 */
export const getTenantScope = (table, user) => {
  if (user.role === 'super_admin') {
    return undefined; // Tanpa filter
  }
  
  if (user.role === 'customer') {
    // Customer hanya bisa melihat unit miliknya, tapi tabel tetap harus punya userId
    if (table.userId) {
      return eq(table.userId, user.sub);
    }
    // Jika tabel tidak punya userId (misal project/cluster), lemparkan error atau limit
    return eq(table.companyId, user.companyId); 
  }

  // Untuk Admin & Customer Service
  return eq(table.companyId, user.companyId);
};