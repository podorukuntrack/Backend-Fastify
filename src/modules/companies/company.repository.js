// src/modules/companies/company.repository.js
import { db } from '../../config/database.js';
import { companies } from '../../shared/schemas/schema.js';
import { eq } from 'drizzle-orm';

export const findAllCompanies = async () => {
  return await db.select().from(companies);
};

export const findCompanyById = async (id) => {
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0];
};

export const insertCompany = async (data) => {
  const result = await db.insert(companies).values(data).returning();
  return result[0];
};

export const updateCompany = async (id, data) => {
  data.updatedAt = new Date();
  const result = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
  return result[0];
};

export const deleteCompany = async (id) => {
  const result = await db.delete(companies).where(eq(companies.id, id)).returning();
  return result[0];
};