import { db } from '../../config/database.js';
import { userDevices } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';

export const upsertDeviceToken = async (userId, fcmToken, deviceType) => {
  // Check if token already exists
  const existing = await db
    .select()
    .from(userDevices)
    .where(eq(userDevices.fcmToken, fcmToken))
    .limit(1);

  if (existing.length > 0) {
    // Update existing token
    const result = await db
      .update(userDevices)
      .set({
        userId,
        deviceType,
        updatedAt: new Date(),
      })
      .where(eq(userDevices.fcmToken, fcmToken))
      .returning();
    return result[0];
  }

  // Insert new token
  const result = await db
    .insert(userDevices)
    .values({
      userId,
      fcmToken,
      deviceType,
    })
    .returning();
  return result[0];
};

export const deleteDeviceToken = async (fcmToken) => {
  await db.delete(userDevices).where(eq(userDevices.fcmToken, fcmToken));
};