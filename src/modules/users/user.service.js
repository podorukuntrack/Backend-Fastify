// src/modules/users/user.service.js
import bcrypt from 'bcrypt';
import * as repo from './user.repository.js';

export const getUsers = async (page, limit, userContext) => {
  const { data, total } = await repo.findUsers(page, limit, userContext);
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: totalPages || 1
    }
  };
};

export const getUser = async (id, userContext) => {
  const user = await repo.findUserById(id, userContext);
  if (!user) throw new Error('User not found or access denied');
  return user;
};

export const createUser = async (data, userContext) => {
  if (userContext.role === 'admin') {
    data.companyId = userContext.companyId;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  // Mapping data agar sesuai dengan schema.js sebelum dikirim ke repository
  const userData = {
    company_id: data.companyId,
    nama: data.name,
    email: data.email,
    password_hash: hashedPassword, // <--- Sesuaikan dengan properti di schema.js
    role: data.role
  };

  return await repo.insertUser(userData);
};

export const modifyUser = async (id, data, userContext) => {
  const user = await repo.updateUser(id, data, userContext);
  if (!user) throw new Error('User not found or access denied');
  return user;
};

export const removeUser = async (id, userContext) => {
  const user = await repo.deleteUser(id, userContext);
  if (!user) throw new Error('User not found or access denied');
  return user;
};