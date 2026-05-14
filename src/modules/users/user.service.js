  // src/modules/users/user.service.js
  import bcrypt from 'bcrypt';
  import * as repo from './user.repository.js';

  export const getUsers = async (page, limit, userContext, filters = {}) => {
    const { data, total } = await repo.findUsers(page, limit, userContext, filters);
    
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
      data.company_id = userContext.companyId;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Mapping data agar sesuai dengan schema.js sebelum dikirim ke repository
    const userData = {
      company_id: data.company_id ?? data.companyId ?? null,
      nama: data.nama ?? data.name,
      email: data.email,
      password_hash: hashedPassword,
      nomor_telepon: data.nomor_telepon,
      role: data.role,
      status: data.status,
    };

    return await repo.insertUser(userData);
  };

  export const modifyUser = async (id, data, userContext) => {
    const updateData = {
      company_id: data.company_id ?? data.companyId,
      nama: data.nama ?? data.name,
      email: data.email,
      nomor_telepon: data.nomor_telepon,
      role: data.role,
      status: data.status,
    };

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(data.password, salt);
    }

    const user = await repo.updateUser(id, updateData, userContext);
    if (!user) throw new Error('User not found or access denied');
    return user;
  };

  export const removeUser = async (id, userContext) => {
    const user = await repo.deleteUser(id, userContext);
    if (!user) throw new Error('User not found or access denied');
    return user;
  };
