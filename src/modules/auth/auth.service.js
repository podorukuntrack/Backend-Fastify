import { upsertDeviceToken, deleteDeviceToken } from '../users/device.repository.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  findRefreshTokenByHash,
  findUserByEmail,
  revokeRefreshTokenByHash,
  saveRefreshToken,
  findUserById,
  updateUserPassword,
  findUserByPhone,
  updateUserProfile,
  anonymizeUserAccount,
  hasActiveAssignments,
  updateUserAppleToken
} from './auth.repository.js';
import { verifyAppleToken, exchangeAppleToken, revokeAppleToken } from './apple-auth.service.js';
import { insertUser } from '../users/user.repository.js';
import { sendWhatsAppMessage } from '../whatsapp/whatsapp.service.js';
import { findCompanyById } from '../companies/company.repository.js';
import { getRedisClient } from '../../shared/utils/cache.js';
import { sendOTPByEmail } from './auth.email.js';

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

  let company = null;
  if (user.company_id) {
    company = await findCompanyById(user.company_id);
  }

  // Response
  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      name: user.nama,
      email: user.email,
      role: user.role,
      nomorTelepon: user.nomor_telepon,
      companyId: user.company_id,
      company: company ? {
        name: company.nama_pt,
        logoUrl: company.logo_url,
        themeColor: company.theme_color || '#4f46e5'
      } : null
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

 const accessToken = fastify.jwt.sign(payload);

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

  let company = null;
  if (storedToken.company_id) {
    company = await findCompanyById(storedToken.company_id);
  }

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: storedToken.user_id,
      name: storedToken.nama,
      email: storedToken.email,
      role: storedToken.role,
      nomorTelepon: storedToken.nomor_telepon,
      companyId: storedToken.company_id,
      company: company ? {
        name: company.nama_pt,
        logoUrl: company.logo_url,
        themeColor: company.theme_color || '#4f46e5'
      } : null
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

export const requestOtp = async (method, contact) => {
  let user;
  if (method === 'email') {
    user = await findUserByEmail(contact);
  } else if (method === 'wa') {
    user = await findUserByPhone(contact);
  }

  if (!user) {
    return true; // Prevent enumeration
  }

  // Detect test accounts for Google Play Console review
  const cleanContact = contact.replace(/[^0-9]/g, '');
  const isTestAccount = 
    contact.toLowerCase().includes('tester') || 
    contact.toLowerCase().includes('reviewer') || 
    contact.toLowerCase() === 'podorukuntester@gmail.com' || 
    cleanContact === '081234567890' || 
    cleanContact === '6281234567890' ||
    cleanContact === '082286361965' || 
    cleanContact === '6282286361965' ||
    cleanContact === '089999999999' ||
    cleanContact === '629999999999';

  // Use a static OTP '123456' for test accounts
  const otp = isTestAccount ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  const redisClient = getRedisClient();
  
  if (redisClient) {
    await redisClient.set(`otp:${contact}`, otp, 'EX', 300); // 5 minutes
  } else {
    throw new Error('Redis is not available');
  }

  // Skip sending actual WA/Email for test accounts
  if (isTestAccount) {
    return true;
  }

  if (method === 'wa') {
    if (!user.nomor_telepon) {
       throw new Error('Pengguna tidak memiliki nomor WhatsApp yang terdaftar.');
    }
    const message = `Halo ${user.nama},\n\nKode OTP Lupa Password Anda adalah: *${otp}*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`;
    const context = { role: user.role, companyId: user.company_id };
    await sendWhatsAppMessage(user.nomor_telepon, message, context);
  } else if (method === 'email') {
    await sendOTPByEmail(user.email, otp); // Pastikan kirim ke user.email yang valid
  }

  return true;
};

export const verifyOtp = async (contact, otp) => {
  const redisClient = getRedisClient();
  if (!redisClient) throw new Error('Redis is not available');

  const cleanContact = contact.replace(/[^0-9]/g, '');
  const isTestAccount = 
    contact.toLowerCase().includes('tester') || 
    contact.toLowerCase().includes('reviewer') || 
    contact.toLowerCase() === 'podorukuntester@gmail.com' || 
    cleanContact === '081234567890' || 
    cleanContact === '6281234567890' ||
    cleanContact === '082286361965' || 
    cleanContact === '6282286361965' ||
    cleanContact === '089999999999' ||
    cleanContact === '629999999999';

  const storedOtp = await redisClient.get(`otp:${contact}`);
  
  // Accept static '123456' for test/review accounts
  if (isTestAccount && (otp === '123456' || storedOtp === otp)) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    await redisClient.set(`reset_token:${contact}`, resetToken, 'EX', 900); // 15 mins
    await redisClient.del(`otp:${contact}`);
    return resetToken;
  }

  if (!storedOtp || storedOtp !== otp) {
    throw new Error('OTP tidak valid atau sudah kedaluwarsa');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await redisClient.set(`reset_token:${contact}`, resetToken, 'EX', 900); // 15 mins
  await redisClient.del(`otp:${contact}`);

  return resetToken;
};

export const resetPassword = async (contact, resetToken, newPassword) => {
  const redisClient = getRedisClient();
  if (!redisClient) throw new Error('Redis is not available');

  const storedToken = await redisClient.get(`reset_token:${contact}`);
  if (!storedToken || storedToken !== resetToken) {
    throw new Error('Token reset tidak valid atau sudah kedaluwarsa');
  }

  let user = await findUserByEmail(contact);
  if (!user) {
    user = await findUserByPhone(contact);
  }

  if (!user) {
    throw new Error('User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(user.id, passwordHash);

  await redisClient.del(`reset_token:${contact}`);
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

export const googleLoginUser = async (idToken, fastify) => {
  if (!idToken) {
    throw new Error('ID Token Google diperlukan');
  }

  // 1. Verifikasi ID Token ke Google API
  let tokenInfo;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    tokenInfo = await response.json();
    if (!response.ok || tokenInfo.error) {
      throw new Error(tokenInfo.error_description || 'Token Google tidak valid');
    }
  } catch (error) {
    console.error('Google verification error:', error);
    throw new Error('Gagal memverifikasi akun Google dengan server Google: ' + error.message);
  }

  const email = tokenInfo.email;
  const nama = tokenInfo.name || 'User Google';

  if (!email) {
    throw new Error('Email tidak ditemukan dari akun Google.');
  }

  // 2. Cari user berdasarkan email
  let user = await findUserByEmail(email);

  if (!user) {
    // 3. Register user baru jika tidak ditemukan
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const password_hash = await bcrypt.hash(randomPassword, 10);

    user = await insertUser({
      nama: nama,
      email: email,
      password_hash: password_hash,
      nomor_telepon: null,
      role: 'customer',
      status: 'active',
      company_id: null,
    });
  }

  // 4. RESTRICTION: Hanya allow customer
  if (user.role !== 'customer') {
    throw new Error('Akses Ditolak: Akun Google ini terdaftar sebagai ' + user.role + '. Silakan gunakan akun customer.');
  }

  // 5. Generate JWT tokens
  const payload = {
    sub: user.id,
    companyId: user.company_id,
    role: user.role,
    email: user.email,
  };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: '15m',
  });
  
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  await saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

  let company = null;
  if (user.company_id) {
    company = await findCompanyById(user.company_id);
  }

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      name: user.nama,
      email: user.email,
      role: user.role,
      nomorTelepon: user.nomor_telepon,
      companyId: user.company_id,
      company: company ? {
        name: company.nama_pt,
        logoUrl: company.logo_url,
        themeColor: company.theme_color || '#4f46e5'
      } : null
    },
  };
};

export const updateProfile = async (userId, data) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  // Validasi keunikan nomor telepon jika diinput
  if (data.nomorTelepon) {
    const existingPhoneUser = await findUserByPhone(data.nomorTelepon);
    if (existingPhoneUser && existingPhoneUser.id !== userId) {
      throw new Error('Nomor telepon sudah digunakan oleh akun lain');
    }
  }

  const namaToUpdate = data.nama !== undefined ? data.nama : user.nama;
  const teleponToUpdate = data.nomorTelepon !== undefined ? data.nomorTelepon : user.nomor_telepon;

  const result = await updateUserProfile(userId, namaToUpdate, teleponToUpdate);
  if (!result) {
    throw new Error('Gagal memperbarui profil');
  }

  let company = null;
  if (result.company_id) {
    company = await findCompanyById(result.company_id);
  }

  return {
    id: result.id,
    name: result.nama,
    email: result.email,
    role: result.role,
    nomorTelepon: result.nomor_telepon,
    companyId: result.company_id,
    company: company ? {
      name: company.nama_pt,
      logoUrl: company.logo_url,
      themeColor: company.theme_color || '#4f46e5'
    } : null
  };
};

export const appleLoginUser = async (idToken, userFullName, authorizationCode, fastify) => {
  if (!idToken) {
    throw new Error('ID Token Apple diperlukan');
  }

  // 1. Verifikasi ID Token ke Apple API
  const { appleUserId, email } = await verifyAppleToken(idToken);

  if (!email) {
    throw new Error('Email tidak ditemukan dari akun Apple.');
  }

  // 2. Cari user berdasarkan email
  let user = await findUserByEmail(email);

  if (!user) {
    // 3. Register user baru jika tidak ditemukan
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const password_hash = await bcrypt.hash(randomPassword, 10);

    user = await insertUser({
      nama: userFullName || 'User Apple',
      email: email,
      password_hash: password_hash,
      nomor_telepon: null,
      role: 'customer',
      status: 'active',
      company_id: null,
    });
  }

  // 4. RESTRICTION: Hanya allow customer
  if (user.role !== 'customer') {
    throw new Error('Akses Ditolak: Akun Apple ini terdaftar sebagai ' + user.role + '. Silakan gunakan akun customer.');
  }

  // 4.5. Tukarkan authorizationCode dengan Apple refresh token jika ada
  if (authorizationCode) {
    const appleRefreshToken = await exchangeAppleToken(authorizationCode);
    if (appleRefreshToken) {
      await updateUserAppleToken(user.id, appleRefreshToken);
    }
  }

  // 5. Generate JWT tokens
  const payload = {
    sub: user.id,
    companyId: user.company_id,
    role: user.role,
    email: user.email,
  };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: '15m',
  });
  
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  await saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

  let company = null;
  if (user.company_id) {
    company = await findCompanyById(user.company_id);
  }

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      name: user.nama,
      email: user.email,
      role: user.role,
      nomorTelepon: user.nomor_telepon,
      companyId: user.company_id,
      company: company ? {
        name: company.nama_pt,
        logoUrl: company.logo_url,
        themeColor: company.theme_color || '#4f46e5'
      } : null
    },
  };
};

export const deleteUserAccount = async (userId) => {
  const hasActive = await hasActiveAssignments(userId);
  if (hasActive) {
    throw new Error('Tidak dapat menghapus akun karena Anda masih memiliki unit properti yang aktif atau masa retensinya belum selesai.');
  }

  // Apple App Store Requirement: Revoke token if exists
  const user = await findUserById(userId);
  if (user && user.apple_refresh_token) {
    await revokeAppleToken(user.apple_refresh_token);
  }

  const result = await anonymizeUserAccount(userId);
  if (!result) {
    throw new Error('Gagal menghapus akun pengguna');
  }
  return { success: true };
};