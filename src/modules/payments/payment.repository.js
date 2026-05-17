import { db } from '../../config/database.js';
import { payments } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { getTenantScope } from '../../shared/utils/scopes.js';

export const findAllPayments = async (userContext) => {
  const scope = getTenantScope(payments, userContext);
  return await db.select().from(payments).where(scope).orderBy(payments.createdAt);
};

export const findPaymentsByUnitId = async (unitId, userContext) => {
  const scope = getTenantScope(payments, userContext);
  const condition = scope ? and(eq(payments.unitId, unitId), scope) : eq(payments.unitId, unitId);
  return await db.select().from(payments).where(condition).orderBy(payments.createdAt);
};

export const insertPayment = async (data) => {
  data.paymentDate = new Date(data.paymentDate);
  const result = await db.insert(payments).values(data).returning();
  return result[0];
};