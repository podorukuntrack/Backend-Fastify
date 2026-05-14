// src/modules/auth/auth.service.js

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  findRefreshTokenByHash,
  findUserByEmail,
  revokeRefreshTokenByHash,
  saveRefreshToken,
} from './auth.repository.js';

export const loginUser = async (email, password, fastify) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // JWT payload
  const payload = {
    sub: user.id,
    companyId: user.company_id,
    role: user.role,
    email: user.email,
  };

  // Access token
  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: '15m',
  });
  
  // Refresh token raw
  const rawRefreshToken = crypto
    .randomBytes(40)
    .toString('hex');

  // Hash refresh token
  const hashedRefreshToken = crypto
    .createHash('sha256')
    .update(rawRefreshToken)
    .digest('hex');

  // Expired 30 hari
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  console.log('Login user:', {
    userId: user.id,
    companyId: user.company_id,
    expiresAt,
  });

  // Simpan refresh token
  await saveRefreshToken(
    user.id,
    hashedRefreshToken,
    expiresAt
  );

  // Response
  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      name: user.nama,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    },
  };
};

export const refreshTokenService = async (
  oldRefreshToken,
  fastify
) => {
  if (!oldRefreshToken) {
    throw new Error('Invalid refresh token');
  }

  const hashedOldToken = crypto
    .createHash('sha256')
    .update(oldRefreshToken)
    .digest('hex');

  const storedToken = await findRefreshTokenByHash(hashedOldToken);

  if (
    !storedToken ||
    storedToken.revoked ||
    new Date(storedToken.expires_at).getTime() <= Date.now()
  ) {
    throw new Error('Invalid refresh token');
  }

  const payload = {
    sub: storedToken.user_id,
    companyId: storedToken.company_id,
    role: storedToken.role,
    email: storedToken.email,
  };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: '15m',
  });

  const rawRefreshToken = crypto
    .randomBytes(40)
    .toString('hex');

  const hashedRefreshToken = crypto
    .createHash('sha256')
    .update(rawRefreshToken)
    .digest('hex');

  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  await revokeRefreshTokenByHash(hashedOldToken);
  await saveRefreshToken(
    storedToken.user_id,
    hashedRefreshToken,
    expiresAt
  );

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: storedToken.user_id,
      name: storedToken.nama,
      email: storedToken.email,
      role: storedToken.role,
      companyId: storedToken.company_id,
    },
  };
};

export const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    return true;
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  console.log('Logout token hash:', hashedToken);
  await revokeRefreshTokenByHash(hashedToken);

  return true;
};
