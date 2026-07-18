// src/modules/auth/auth.controller.js
import * as service from './auth.service.js';

const setAuthCookies = (reply, tokens) => {
  reply.setCookie('accessToken', tokens.accessToken, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60
  });

  reply.setCookie('refreshToken', tokens.refreshToken, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60
  });
};

export const loginHandler = async (request, reply) => {
  try {
    const { email, password } = request.body;
    const tokens = await service.loginUser(email, password, request.server);
    
    setAuthCookies(reply, tokens);
    
    return reply.code(200).send({
      success: true,
      message: 'Login successful',
      data: { 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user 
      }
    });
  } catch (error) {
    throw error;
  }
};

import { findUserById } from './auth.repository.js';
import { findCompanyById } from '../companies/company.repository.js';
import { withCache, clearCachePattern } from '../../shared/utils/cache.js';

export const getMeHandler = async (request, reply) => {
  try {
    const cacheKey = `users:me:${request.user.sub}`;
    const { data, source } = await withCache(cacheKey, async () => {
      const user = await findUserById(request.user.sub);
      if (!user) {
        throw new Error('User not found');
      }

      let company = null;
      if (user.company_id) {
        company = await findCompanyById(user.company_id);
      }

      return {
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
      };
    }, 300);

    return reply.code(200).send({
      success: true,
      message: 'Current user retrieved',
      data,
      source
    });
  } catch (error) {
    throw error;
  }
};

export const registerHandler = async (request, reply) => {
  try {
    const tokens = await service.registerCustomer(request.body, request.server);
    
    setAuthCookies(reply, tokens);
    
    return reply.code(201).send({
      success: true,
      message: 'Registrasi berhasil',
      data: { 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user 
      }
    });
  } catch (error) {
    throw error;
  }
};

export const googleLoginHandler = async (request, reply) => {
  try {
    const { idToken } = request.body;
    const tokens = await service.googleLoginUser(idToken, request.server);
    
    setAuthCookies(reply, tokens);
    
    return reply.code(200).send({
      success: true,
      message: 'Login Google berhasil',
      data: { 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user 
      }
    });
  } catch (error) {
    throw error;
  }
};

export const requestOtpHandler = async (request, reply) => {
  try {
    const { method, contact } = request.body;
    await service.requestOtp(method, contact);
    
    return reply.code(200).send({
      success: true,
      message: 'Jika kontak terdaftar, OTP telah dikirim.',
    });
  } catch (error) {
    throw error;
  }
};

export const verifyOtpHandler = async (request, reply) => {
  try {
    const { contact, otp } = request.body;
    const resetToken = await service.verifyOtp(contact, otp);
    
    return reply.code(200).send({
      success: true,
      message: 'OTP valid',
      data: { resetToken }
    });
  } catch (error) {
    throw error;
  }
};

export const resetPasswordHandler = async (request, reply) => {
  try {
    const { contact, resetToken, newPassword } = request.body;
    await service.resetPassword(contact, resetToken, newPassword);
    
    return reply.code(200).send({
      success: true,
      message: 'Password berhasil diubah',
    });
  } catch (error) {
    throw error;
  }
};

export const changePasswordHandler = async (request, reply) => {
  try {
    const { oldPassword, newPassword } = request.body;
    const userId = request.user.sub;
    
    await service.changePassword(userId, oldPassword, newPassword);
    
    return reply.code(200).send({
      success: true,
      message: 'Password berhasil diubah',
    });
  } catch (error) {
    throw error;
  }
};

export const updateProfileHandler = async (request, reply) => {
  try {
    const userId = request.user.sub;
    const { nama, nomorTelepon } = request.body;

    const updated = await service.updateProfile(userId, { nama, nomorTelepon });
    await clearCachePattern('users:*');
    
    return reply.code(200).send({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: updated
    });
  } catch (error) {
    throw error;
  }
};

export const appleLoginHandler = async (request, reply) => {
  try {
    const { idToken, fullName, authorizationCode } = request.body;
    const tokens = await service.appleLoginUser(idToken, fullName, authorizationCode, request.server);
    
    setAuthCookies(reply, tokens);
    
    return reply.code(200).send({
      success: true,
      message: 'Login Apple berhasil',
      data: { 
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user 
      }
    });
  } catch (error) {
    throw error;
  }
};

export const deleteAccountHandler = async (request, reply) => {
  return reply.code(403).send({
    success: false,
    message: 'Penghapusan akun dari aplikasi tidak diizinkan. Silakan hubungi Admin untuk menghapus akun Anda.',
    errors: []
  });
};