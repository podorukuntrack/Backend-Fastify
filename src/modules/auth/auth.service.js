// src/modules/auth/auth.service.js

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { findUserByEmail, saveRefreshToken } from './auth.repository.js';

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
  throw new Error('Not implemented');
};

export const logoutUser = async (refreshToken) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  console.log('Logout token hash:', hashedToken);

  return true;
};