  // src/modules/auth/auth.repository.js

import { db } from '../../config/database.js';
import { users, refreshTokens } from '../../shared/schemas/schema.js';
import { eq, sql } from 'drizzle-orm';

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
      u.nama
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
