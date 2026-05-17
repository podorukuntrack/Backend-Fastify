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

import { findUserById } from '../users/user.repository.js';

export const getMeHandler = async (request, reply) => {
  try {
    const user = await findUserById(request.user.sub);
    if (!user) {
      return reply.code(404).send({
        success: false,
        message: 'User not found'
      });
    }
    return reply.code(200).send({
      success: true,
      message: 'Current user retrieved',
      data: {
        id: user.id,
        name: user.nama,
        email: user.email,
        role: user.role,
        companyId: user.company_id
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

export const forgotPasswordHandler = async (request, reply) => {
  try {
    const { email } = request.body;
    await service.forgotPassword(email);
    
    return reply.code(200).send({
      success: true,
      message: 'Jika email terdaftar, instruksi reset password telah dikirim ke nomor WhatsApp terkait.',
    });
  } catch (error) {
    if (error.message === 'Pengguna tidak memiliki nomor WhatsApp yang terdaftar.') {
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