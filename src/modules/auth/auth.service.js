// src/modules/auth/auth.service.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { findUserByEmail, saveRefreshToken } from './auth.repository.js';
import { eq, and } from 'drizzle-orm';


export const loginUser = async (email, password, fastify) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error('Invalid credentials');


  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) throw new Error('Invalid credentials');

  // Generate JWT Payload
  const payload = {
    sub: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email
  };

  // Generate Access Token (15 menit)
  const accessToken = fastify.jwt.sign(payload, { expiresIn: '15m' });

  // Generate Refresh Token (30 hari) - Kita buat token acak, hash, lalu simpan ke DB
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; 

  await saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

return {
  accessToken,
  refreshToken: rawRefreshToken,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  },
};
};

export const refreshTokenService = async (oldRefreshToken, fastify) => {
  const hashedOldToken = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
  
  // Cari token di database
  const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token, hashedOldToken)).limit(1);
  const tokenData = result[0];

  if (!tokenData || new Date() > tokenData.expiresAt) {
    throw new Error('Invalid or expired refresh token');
  }

  // Ambil data user
  const userResult = await db.select().from(users).where(eq(users.id, tokenData.userId)).limit(1);
  const user = userResult[0];

  if (!user) throw new Error('User not found');

  // Hapus token lama
  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenData.id));

  // Generate payload baru
  const payload = { sub: user.id, companyId: user.companyId, role: user.role, email: user.email };
  const newAccessToken = fastify.jwt.sign(payload, { expiresIn: '15m' });

  const rawNewRefreshToken = crypto.randomBytes(40).toString('hex');
  const hashedNewRefreshToken = crypto.createHash('sha256').update(rawNewRefreshToken).digest('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; 

  await saveRefreshToken(user.id, hashedNewRefreshToken, expiresAt);

  return { accessToken: newAccessToken, refreshToken: rawNewRefreshToken };
};

export const logoutUser = async (refreshToken) => {
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.delete(refreshTokens).where(eq(refreshTokens.token, hashedToken));
  return true;
};