import { upsertDeviceToken, deleteDeviceToken } from '../users/device.repository.js';


import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  findRefreshTokenByHash,
  findUserByEmail,
  revokeRefreshTokenByHash,
  saveRefreshToken,
  findUserById,
  updateUserPassword
} from './auth.repository.js';
import { insertUser } from '../users/user.repository.js';
import { sendWhatsAppMessage } from '../whatsapp/whatsapp.service.js';

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

export const registerDeviceToken = async (userId, fcmToken, deviceType) => {
  return await upsertDeviceToken(userId, fcmToken, deviceType);
};

export const unregisterDeviceToken = async (userId, fcmToken) => {
  return await deleteDeviceToken(fcmToken);
};

export const registerCustomer = async (data, fastify) => {
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new Error('Email sudah terdaftar');
  }

  const password_hash = await bcrypt.hash(data.password, 10);

  // Simpan user baru dengan role customer
  await insertUser({
    nama: data.nama,
    email: data.email,
    password_hash,
    nomor_telepon: data.nomorTelepon || data.nomor_telepon || null,
    role: 'customer',
    status: 'active',
    company_id: data.companyId || data.company_id || null,
  });

  // Login otomatis setelah register
  return await loginUser(data.email, data.password, fastify);
};

export const forgotPassword = async (email) => {
  const user = await findUserByEmail(email);
  if (!user) {
    // Kita tidak ingin memberi tahu penyerang apakah email terdaftar atau tidak
    return true; 
  }

  if (!user.nomor_telepon) {
    throw new Error('Pengguna tidak memiliki nomor WhatsApp yang terdaftar.');
  }

  // Generate 6 digit random number
  const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password di DB
  await updateUserPassword(user.id, passwordHash);

  // Kirim WhatsApp
  const message = `Halo ${user.nama},\n\nPassword baru Anda adalah: *${newPassword}*\n\nSilakan gunakan password ini untuk login. Setelah berhasil masuk, kami sarankan Anda segera menggantinya di menu Profil.`;
  
  // Memakai context dummy yang meminjam companyId dari user
  const context = { role: user.role, companyId: user.company_id };
  await sendWhatsAppMessage(user.nomor_telepon, message, context);

  return true;
};

export const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Password lama tidak sesuai');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(userId, newPasswordHash);

  return true;
};