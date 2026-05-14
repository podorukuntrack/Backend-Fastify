// src/modules/users/user.controller.js
import * as service from './user.service.js';

export const getAllHandler = async (request, reply) => {
  const { page, limit, search, role } = request.query;
  const result = await service.getUsers(page, limit, request.user, { search, role });
  
  // Custom response untuk pagination
  return reply.code(200).send(result);
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getUser(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createUser(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'User created', data });
  } catch (error) {
    // Tangani error duplicate email dari PostgreSQL
    if (error.code === '23505') {
      return reply.code(409).send({ success: false, message: 'Email already exists', errors: [] });
    }
    throw error;
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyUser(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'User updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeUser(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'User deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};
