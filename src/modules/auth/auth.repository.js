// src/modules/auth/auth.repository.js
import { db } from "../../config/database.js";
import { users, refreshTokens } from "../../shared/schemas/schema.js";
import { eq } from "drizzle-orm";

export const findUserByEmail = async (email) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
};

export const saveRefreshToken = async (userId, hashedToken, expiresAt) => {
  await db.insert(refreshTokens).values({
    user_id: userId,
    token: hashedToken,
    expires_at: new Date(expiresAt),
  });
};
