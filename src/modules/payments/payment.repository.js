import { db } from '../../config/database.js';
import { payments } from '../../shared/schemas/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findAllPayments = async (userContext) => {
  const scope = getTenantScope(payments, userContext);
  return await db.select().from(payments).where(scope).orderBy(payments.createdAt);
};

export const findPaymentsByUnitId = async (unitId, userContext) => {
  let scopeCondition = sql`true`;
  if (userContext.role === 'customer') {
    scopeCondition = sql`pa.user_id = ${userContext.sub}::uuid`;
  } else if (userContext.role !== 'super_admin') {
    scopeCondition = sql`proj.company_id = ${userContext.companyId}::uuid`;
  }

  const rows = await db.execute(sql`
    SELECT 
      ph.id,
      ph.jumlah_bayar AS amount,
      'verified' AS status,
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
    ORDER BY ph.tanggal_bayar DESC
  `);

  return rows.map(row => ({
    id: row.id,
    amount: Number(row.amount ?? 0),
    status: row.status ?? 'pending',
    method: row.method ?? 'transfer',
    paymentDate: row.paymentDate ? new Date(row.paymentDate) : new Date(),
    receiptUrl: row.receiptUrl || null,
    notes: row.notes || null
  }));
};

export const insertPayment = async (data) => {
  data.paymentDate = new Date(data.paymentDate);
  const result = await db.insert(payments).values(data).returning();
  return result[0];
};