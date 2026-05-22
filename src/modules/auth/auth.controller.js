// src/modules/auth/auth.controller.js
import * as service from './auth.service.js';

export const loginHandler = async (request, reply) => {
  try {
    const { email, password } = request.body;
    // Disini idealnya pakai validasi Zod (akan kita tambahkan jika butuh middleware validasi)
    
    const tokens = await service.loginUser(email, password, request.server);
    
    return reply.code(200).send({
      success: true,
      message: 'Login successful',
      data: tokens
    });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return reply.code(401).send({ success: false, message: error.message, errors: [] });
    }
    throw error; // Lempar ke Global Error Handler
  }
};

import { findUserById } from './auth.repository.js';
import { findCompanyById } from '../companies/company.repository.js';

export const getMeHandler = async (request, reply) => {
  try {
    const user = await findUserById(request.user.sub);
    if (!user) {
      return reply.code(404).send({
        success: false,
        message: 'User not found'
      });
    }

    let company = null;
    if (user.company_id) {
      company = await findCompanyById(user.company_id);
    }

    return reply.code(200).send({
      success: true,
      message: 'Current user retrieved',
      data: {
        id: user.id,
        name: user.nama,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
        company: company ? {
          name: company.nama_pt,
          logoUrl: company.logo_url,
          themeColor: company.theme_color || '#4f46e5'
        } : null
      }
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      message: error.message
    });
  }
};

export const registerHandler = async (request, reply) => {
  try {
    const tokens = await service.registerCustomer(request.body, request.server);
    
    return reply.code(201).send({
      success: true,
      message: 'Registrasi berhasil',
      data: tokens
    });
  } catch (error) {
    if (error.message === 'Email sudah terdaftar') {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
    throw error;
  }
};

export const googleLoginHandler = async (request, reply) => {
  try {
    const { idToken } = request.body;
    const tokens = await service.googleLoginUser(idToken, request.server);
    
    return reply.code(200).send({
      success: true,
      message: 'Login Google berhasil',
      data: tokens
    });
  } catch (error) {
    if (error.message.includes('Akses Ditolak') || error.message.includes('tidak valid') || error.message.includes('diperlukan')) {
      return reply.code(400).send({
        success: false,
        message: error.message
      });
    }
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
    if (error.message.includes('Pengguna tidak memiliki nomor WhatsApp')) {
      return reply.code(400).send({ success: false, message: error.message });
    }
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
    if (error.message.includes('OTP tidak valid')) {
      return reply.code(400).send({ success: false, message: error.message });
    }
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
    if (error.message.includes('Token reset tidak valid') || error.message.includes('User not found')) {
      return reply.code(400).send({ success: false, message: error.message });
    }
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
    if (error.message === 'Password lama tidak sesuai' || error.message === 'User not found') {
      return reply.code(400).send({ success: false, message: error.message });
    }
    throw error;
  }
};