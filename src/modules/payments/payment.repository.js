import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

/**
 * Riwayat pembayaran satu unit.
 *
 * Query ini sengaja raw SQL terhadap `payment_history` — tabel Drizzle `payments`
 * yang dulu ada di sini memetakan kolom yang tidak pernah ada di database
 * (company_id, method, status, updated_at) sehingga selalu gagal. Kolom `status`
 * dan `method` di bawah adalah nilai tetap agar bentuk respons ke aplikasi
 * mobile tidak berubah.
 */
export const findPaymentsByUnitId = async (unitId, userContext) => {
  let scopeCondition = sql`true`;
  if (userContext.role === 'customer') {
    scopeCondition = sql`pa.user_id = ${userContext.sub}::uuid`;
  } else if (!['super_admin', 'owner'].includes(userContext.role)) {
    scopeCondition = sql`proj.company_id = ${userContext.companyId}::uuid`;
  }

  const rows = await db.execute(sql`
    SELECT
      ph.id,
      ph.jumlah_bayar AS amount,
      'diterima' AS status,
      'transfer' AS method,
      ph.tanggal_bayar AS "paymentDate",
      ph.bukti_pembayaran AS "receiptUrl",
      ph.catatan AS notes
    FROM payment_history ph
    JOIN property_assignments pa ON pa.id = ph.assignment_id
    JOIN units u ON u.id = pa.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects proj ON proj.id = c.project_id
    WHERE pa.unit_id = ${unitId}::uuid
      AND ${scopeCondition}
      AND (ph.is_auto_inject = false OR ph.is_auto_inject IS NULL)
    ORDER BY ph.tanggal_bayar DESC
  `);

  return rows.map(row => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    status: row.status ?? 'diterima',
    method: row.method ?? 'transfer',
    paymentDate: row.paymentDate ? new Date(row.paymentDate) : new Date(),
    receiptUrl: row.receiptUrl || null,
    notes: row.notes || null,
    isAutoInjeksi: false
  }));
};
