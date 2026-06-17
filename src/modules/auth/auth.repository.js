  // src/modules/auth/auth.repository.js

import { db } from '../../config/database.js';
import { users, refreshTokens } from '../../shared/schemas/schema.js';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

export const findUserByEmail = async (email) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
};

export const findUserByPhone = async (phone) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.nomor_telepon, phone))
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

export const findRefreshTokenByHash = async (tokenHash) => {
  const result = await db.execute(sql`
    SELECT
      rt.id,
      rt.user_id,
      rt.expires_at,
      rt.revoked,
      u.email,
      u.role,
      u.company_id,
      u.nama,
      u.nomor_telepon
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = ${tokenHash}
    LIMIT 1
  `);

  return result[0] || null;
};

export const revokeRefreshTokenByHash = async (tokenHash) => {
  await db.execute(sql`
    UPDATE refresh_tokens
       SET revoked = TRUE
     WHERE token_hash = ${tokenHash}
  `);
};

export const findUserById = async (userId) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] || null;
};

export const updateUserPassword = async (userId, newPasswordHash) => {
  await db
    .update(users)
    .set({ password_hash: newPasswordHash, updated_at: new Date() })
    .where(eq(users.id, userId));
};

export const updateUserProfile = async (userId, nama, nomorTelepon) => {
  const result = await db
    .update(users)
    .set({
      nama,
      nomor_telepon: nomorTelepon,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return result[0] || null;
};

export const anonymizeUserAccount = async (userId) => {
  const result = await db.transaction(async (tx) => {
    // 1. Delete refresh tokens
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    
    // 2. Delete FCM device tokens
    await tx.execute(sql`DELETE FROM user_devices WHERE user_id = ${userId}`);

    // 3. Anonymize user profile info
    const randomHex = crypto.randomBytes(8).toString('hex');
    const anonEmail = `deleted_${userId.substring(0, 8)}_${randomHex}@podorukun.com`;
    
    const [updatedUser] = await tx
      .update(users)
      .set({
        nama: 'Pengguna Terhapus',
        email: anonEmail,
        nomor_telepon: null,
        password_hash: 'DELETED_' + crypto.randomBytes(32).toString('hex'),
        updated_at: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
      
    return updatedUser || null;
  });
  return result;
};
