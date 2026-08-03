// src/modules/auth/auth.repository.js

import { db } from '../../config/database.js';
import { users, refreshTokens } from '../../shared/schemas/schema.js';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { AppError } from '../../shared/utils/AppError.js';

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
  await db.insert(refreshTokens).values({
    userId,
    token: tokenHash,
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
      u.nomor_telepon,
      u.status
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = ${tokenHash}
      AND rt.revoked = FALSE
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

// FIX H1: Revoke semua refresh token milik user — dipanggil saat password berubah
export const revokeAllUserRefreshTokens = async (userId) => {
  await db.execute(sql`
    UPDATE refresh_tokens
       SET revoked = TRUE
     WHERE user_id = ${userId}::uuid
       AND revoked = FALSE
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
        // Ditandai nonaktif agar guard status di alur login/refresh ikut menolak,
        // bukan hanya mengandalkan password_hash yang sudah tidak valid.
        status: 'inactive',
        updated_at: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
      
    return updatedUser || null;
  });
  return result;
};

/**
 * Unit yang menahan penghapusan akun: assignment yang masih aktif, dan retensinya
 * belum lewat. Mengembalikan nomor unit agar pesan penolakan bisa menyebut
 * unit mana yang jadi penyebab.
 *
 * Sebelumnya menyaring `status_kepemilikan != 'cancelled'`, padahal CHECK constraint
 * tabelnya hanya mengizinkan 'active' dan 'inactive' — jadi filter itu tidak pernah
 * menyaring apa pun. Assignment yang sudah di-nonaktifkan seharusnya tidak menahan.
 */
export const findBlockingAssignments = async (userId) => {
  const rows = await db.execute(sql`
    SELECT DISTINCT u.nomor_unit
    FROM property_assignments pa
    JOIN units u ON u.id = pa.unit_id
    LEFT JOIN retentions r ON r.unit_id = pa.unit_id
    WHERE pa.user_id = ${userId}::uuid
      AND pa.status_kepemilikan = 'active'
      AND (r.id IS NULL OR r.due_date >= NOW())
    ORDER BY u.nomor_unit
  `);
  return rows.map((r) => r.nomor_unit).filter(Boolean);
};

export const updateUserAppleToken = async (userId, token) => {
  await db.update(users)
    .set({ apple_refresh_token: token })
    .where(eq(users.id, userId));
};
