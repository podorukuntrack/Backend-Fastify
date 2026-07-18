import { upsertDeviceToken, deleteDeviceToken } from '../users/device.repository.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  findRefreshTokenByHash,
  findUserByEmail,
  revokeRefreshTokenByHash,
  revokeAllUserRefreshTokens,
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
import { AppError } from '../../shared/utils/AppError.js';

// ── Whitelist akun test untuk review Google Play Console dan App Store ──
// Menggunakan exact-match agar tidak bisa di-exploit dengan substring (misal: "mytester@gmail.com")
const TEST_ACCOUNTS = [
  'podorukuntester@gmail.com',
  '081234567890',
  '6281234567890',
  '082286361965',
  '6282286361965',
  '089999999999',
  '629999999999',
];

const isTestContact = (contact) => {
  const cleanContact = contact.replace(/[^0-9]/g, '');
  return TEST_ACCOUNTS.includes(contact.toLowerCase()) || TEST_ACCOUNTS.includes(cleanContact);
};

export const loginUser = async (email, password, fastify) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError('Email atau password salah.', 401);
  }

  const isValidPassword = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isValidPassword) {
    throw new AppError('Email atau password salah.', 401);
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
    throw new AppError('Sesi tidak valid atau telah kedaluwarsa.', 401);
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
    throw new AppError('Sesi tidak valid atau telah kedaluwarsa.', 401);
  }

  const payload = {
    sub: storedToken.user_id,
    companyId: storedToken.company_id,
    role: storedToken.role,
    email: storedToken.email,
  };

  // FIX H6: Tambahkan expiresIn agar access token tidak berlaku selamanya
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
    throw new AppError('Email sudah terdaftar', 400);
  }

  const submittedPhone = data.nomorTelepon || data.nomor_telepon;
  if (submittedPhone) {
    const existingPhoneUser = await findUserByPhone(submittedPhone);
    if (existingPhoneUser) {
      throw new AppError('Nomor telepon sudah terdaftar', 400);
    }
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
    if (!user && contact.startsWith('0')) {
      user = await findUserByPhone('62' + contact.substring(1));
    } else if (!user && contact.startsWith('62')) {
      user = await findUserByPhone('0' + contact.substring(2));
    }
  }

  if (!user) {
    return true; // Prevent enumeration
  }

  // FIX H2: Gunakan exact-match whitelist, bukan substring
  const testAccount = isTestContact(contact);

  // Use a static OTP '123456' for test accounts
  const otp = testAccount ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  const redisClient = getRedisClient();
  
  if (redisClient) {
    await redisClient.set(`otp:${contact}`, otp, 'EX', 300); // 5 minutes
  } else {
    throw new AppError('Layanan sementara tidak tersedia.', 503);
  }

  // Skip sending actual WA/Email for test accounts
  if (testAccount) {
    return true;
  }

  if (method === 'wa') {
    if (!user.nomor_telepon) {
       throw new AppError('Pengguna tidak memiliki nomor WhatsApp yang terdaftar.', 400);
    }
    const message = `Halo ${user.nama},\n\nKode OTP Lupa Password Anda adalah: *${otp}*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`;
    const context = { role: user.role, companyId: user.company_id };
    await sendWhatsAppMessage(user.nomor_telepon, message, context);
  } else if (method === 'email') {
    await sendOTPByEmail(user.email, otp);
  }

  return true;
};

export const verifyOtp = async (contact, otp) => {
  const redisClient = getRedisClient();
  if (!redisClient) throw new AppError('Layanan sementara tidak tersedia.', 503);

  // FIX H2: Gunakan exact-match whitelist, bukan substring
  const testAccount = isTestContact(contact);

  const storedOtp = await redisClient.get(`otp:${contact}`);
  
  // Accept static '123456' for test/review accounts
  if (testAccount && (otp === '123456' || storedOtp === otp)) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    await redisClient.set(`reset_token:${contact}`, resetToken, 'EX', 900); // 15 mins
    await redisClient.del(`otp:${contact}`);
    return resetToken;
  }

  if (!storedOtp || storedOtp !== otp) {
    throw new AppError('OTP tidak valid atau sudah kedaluwarsa', 400);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await redisClient.set(`reset_token:${contact}`, resetToken, 'EX', 900); // 15 mins
  await redisClient.del(`otp:${contact}`);

  return resetToken;
};

export const resetPassword = async (contact, resetToken, newPassword) => {
  const redisClient = getRedisClient();
  if (!redisClient) throw new AppError('Layanan sementara tidak tersedia.', 503);

  const storedToken = await redisClient.get(`reset_token:${contact}`);
  if (!storedToken || storedToken !== resetToken) {
    throw new AppError('Token reset tidak valid atau sudah kedaluwarsa', 400);
  }

  let user = await findUserByEmail(contact);
  if (!user) {
    user = await findUserByPhone(contact);
    if (!user && contact.startsWith('0')) {
      user = await findUserByPhone('62' + contact.substring(1));
    } else if (!user && contact.startsWith('62')) {
      user = await findUserByPhone('0' + contact.substring(2));
    }
  }

  if (!user) {
    throw new AppError('Data pengguna tidak ditemukan.', 404);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(user.id, passwordHash);

  // FIX H1: Revoke semua refresh token saat password direset
  await revokeAllUserRefreshTokens(user.id);

  await redisClient.del(`reset_token:${contact}`);
  return true;
};

export const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('Data pengguna tidak ditemukan.', 404);
  }

  const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isValidPassword) {
    throw new AppError('Password lama tidak sesuai', 400);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(userId, newPasswordHash);

  // FIX H1: Revoke semua refresh token saat password berubah — mencegah attacker
  // yang sudah punya refresh token lama tetap bisa mengakses akun
  await revokeAllUserRefreshTokens(userId);

  return true;
};

export const googleLoginUser = async (idToken, fastify) => {
  if (!idToken) {
    throw new AppError('ID Token Google diperlukan', 400);
  }

  // 1. Verifikasi ID Token ke Google API
  let tokenInfo;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    tokenInfo = await response.json();
    if (!response.ok || tokenInfo.error) {
      throw new AppError(tokenInfo.error_description || 'Token Google tidak valid');
    }
  } catch (error) {
    console.error('Google verification error:', error);
    throw new AppError('Gagal memverifikasi akun Google dengan server Google: ' + error.message);
  }

  const email = tokenInfo.email;
  const nama = tokenInfo.name || 'User Google';

  if (!email) {
    throw new AppError('Email tidak ditemukan dari akun Google.', 400);
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
    throw new AppError('Akses Ditolak: Akun Google ini terdaftar sebagai ' + user.role + '. Silakan gunakan akun customer.', 400);
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
    throw new AppError('User tidak ditemukan', 400);
  }

  // Validasi keunikan nomor telepon jika diinput
  if (data.nomorTelepon) {
    const existingPhoneUser = await findUserByPhone(data.nomorTelepon);
    if (existingPhoneUser && existingPhoneUser.id !== userId) {
      throw new AppError('Nomor telepon sudah digunakan oleh akun lain', 400);
    }
  }

  const namaToUpdate = data.nama !== undefined ? data.nama : user.nama;
  const teleponToUpdate = data.nomorTelepon !== undefined ? data.nomorTelepon : user.nomor_telepon;

  const result = await updateUserProfile(userId, namaToUpdate, teleponToUpdate);
  if (!result) {
    throw new AppError('Gagal memperbarui profil', 400);
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
    throw new AppError('ID Token Apple diperlukan', 400);
  }

  // 1. Verifikasi ID Token ke Apple API
  const { appleUserId, email } = await verifyAppleToken(idToken);

  if (!email) {
    throw new AppError('Email tidak ditemukan dari akun Apple.', 400);
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
    throw new AppError('Akses Ditolak: Akun Apple ini terdaftar sebagai ' + user.role + '. Silakan gunakan akun customer.', 400);
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
    throw new AppError('Tidak dapat menghapus akun karena Anda masih memiliki unit properti yang aktif atau masa retensinya belum selesai.', 400);
  }

  // Apple App Store Requirement: Revoke token if exists
  const user = await findUserById(userId);
  if (user && user.apple_refresh_token) {
    await revokeAppleToken(user.apple_refresh_token);
  }

  const result = await anonymizeUserAccount(userId);
  if (!result) {
    throw new AppError('Gagal menghapus akun pengguna', 400);
  }
  return { success: true };
};