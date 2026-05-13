// src/modules/auth/auth.repository.js

import { db } from '../../config/database.js';
import { users, refreshTokens } from '../../shared/schemas/schema.js';
import { eq } from 'drizzle-orm';

export const findUserByEmail = async (email) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
};

export const saveRefreshToken = async (
  userId,
  tokenHash,
  expiresAt
) => {
  console.log('saveRefreshToken params:', {
    userId,
    tokenHash,
    expiresAt,
  });

  await db.insert(refreshTokens).values({
    userId,
    token: tokenHash, // <--- Ubah key di sini menjadi "token"
    expiresAt: new Date(expiresAt),
  });
};