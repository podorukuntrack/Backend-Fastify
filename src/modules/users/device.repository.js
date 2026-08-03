import { db } from '../../config/database.js';
import { userDevices } from '../../shared/schemas/schema.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../../shared/utils/AppError.js';

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

// Token hanya boleh dihapus oleh pemiliknya — tanpa filter userId, siapa pun yang
// mengetahui token milik orang lain bisa mematikan notifikasi akun tersebut.
export const deleteDeviceToken = async (userId, fcmToken) => {
  await db
    .delete(userDevices)
    .where(and(eq(userDevices.fcmToken, fcmToken), eq(userDevices.userId, userId)));
};