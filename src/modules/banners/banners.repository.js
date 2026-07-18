import { db } from '../../config/database.js';
import { banners } from '../../shared/schemas/schema.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../../shared/utils/AppError.js';

export const findAll = async () => {
  return await db.select().from(banners);
};

export const findById = async (id) => {
  const result = await db.select().from(banners).where(eq(banners.id, id));
  return result[0];
};

export const insert = async (data) => {
  const result = await db.insert(banners).values(data).returning();
  return result[0];
};

export const update = async (id, data) => {
  const result = await db.update(banners).set({ ...data, updatedAt: new Date() }).where(eq(banners.id, id)).returning();
  return result[0];
};

export const remove = async (id) => {
  const result = await db.delete(banners).where(eq(banners.id, id)).returning();
  return result[0];
};
