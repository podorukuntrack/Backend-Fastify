// src/modules/auth/auth.controller.js
import { loginUser } from './auth.service.js';

export const loginHandler = async (request, reply) => {
  try {
    const { email, password } = request.body;
    // Disini idealnya pakai validasi Zod (akan kita tambahkan jika butuh middleware validasi)
    
    const tokens = await loginUser(email, password, request.server);
    
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

export const getMeHandler = async (request, reply) => {
  return reply.code(200).send({
    success: true,
    message: 'Current user retrieved',
    data: request.user
  });
};