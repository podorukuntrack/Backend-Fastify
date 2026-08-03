  // src/modules/users/user.service.js
  import bcrypt from 'bcrypt';
  import * as repo from './user.repository.js';
  import { findUserByEmail, findUserByPhone, revokeAllUserRefreshTokens } from '../auth/auth.repository.js';
import { AppError } from '../../shared/utils/AppError.js';

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
    if (!user) throw new AppError('Data pengguna tidak ditemukan atau Anda tidak memiliki akses.', 404);
    return user;
  };

  // Manajemen akun staf (admin/direksi/owner/super_admin) adalah wewenang super_admin.
  // Admin hanya mengelola customer.
  const assertCanManageStaff = (userContext) => {
    if (userContext.role !== 'super_admin') {
      throw new AppError(
        'Hanya Super Admin yang dapat mengelola akun staf (admin/direksi/owner).',
        403
      );
    }
  };

  // '' dan null sama-sama berarti "tidak diisi" — form web mengirim keduanya.
  const normalizeId = (v) => (v === '' || v === null || v === undefined ? null : v);

  export const createUser = async (data, userContext) => {
    // Tanpa penjagaan ini, admin bisa membuat akun super_admin baru lewat POST /users.
    if (data.role && data.role !== 'customer') {
      assertCanManageStaff(userContext);
    }

    if (userContext.companyId && data.role !== 'customer') {
      data.company_id = userContext.companyId;
    }

    const existingEmail = await findUserByEmail(data.email);
    if (existingEmail) {
      throw new AppError('Email sudah terdaftar. Silakan gunakan email lain.', 400);
    }

    if (data.nomor_telepon) {
      const existingPhone = await findUserByPhone(data.nomor_telepon);
      if (existingPhone) {
        throw new AppError('Nomor telepon sudah terdaftar. Silakan gunakan nomor lain.', 400);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Mapping data agar sesuai dengan schema.js sebelum dikirim ke repository
    const userData = {
      company_id: data.role === 'customer' ? null : (data.company_id ?? data.companyId ?? null),
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
    const target = await repo.findUserById(id, userContext);
    if (!target) throw new AppError('Data pengguna tidak ditemukan atau Anda tidak memiliki akses.', 404);

    const isSelf = id === userContext.sub;
    const requestedCompanyId = normalizeId(data.company_id ?? data.companyId);

    if (isSelf) {
      // Jalur eskalasi utama: admin PATCH dirinya sendiri dengan role super_admin.
      // Nama/email/password sendiri tetap boleh diubah.
      if (data.role !== undefined && data.role !== target.role) {
        throw new AppError('Anda tidak dapat mengubah role akun Anda sendiri.', 403);
      }
      if (requestedCompanyId !== null && requestedCompanyId !== normalizeId(target.company_id)) {
        throw new AppError('Anda tidak dapat memindahkan akun Anda sendiri ke perusahaan lain.', 403);
      }
    } else {
      // Menyentuh akun staf, atau menaikkan seseorang menjadi staf, hanya super_admin.
      if (target.role !== 'customer') assertCanManageStaff(userContext);
      if (data.role && data.role !== 'customer') assertCanManageStaff(userContext);
    }

    const updateData = {
      company_id: data.role === 'customer' ? null : (data.company_id ?? data.companyId),
      nama: data.nama ?? data.name,
      email: data.email,
      nomor_telepon: data.nomor_telepon,
      role: data.role,
      status: data.status,
    };

    if (data.email) {
      const existingEmail = await findUserByEmail(data.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new AppError('Email sudah terdaftar pada akun lain. Silakan gunakan email lain.', 400);
      }
    }

    if (data.nomor_telepon) {
      const existingPhone = await findUserByPhone(data.nomor_telepon);
      if (existingPhone && existingPhone.id !== id) {
        throw new AppError('Nomor telepon sudah terdaftar pada akun lain. Silakan gunakan nomor lain.', 400);
      }
    }

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(data.password, salt);
    }

    const user = await repo.updateUser(id, updateData, userContext);
    if (!user) throw new AppError('Data pengguna tidak ditemukan atau Anda tidak memiliki akses.', 404);

    // Menonaktifkan harus langsung memutus sesi yang sedang berjalan. Tanpa ini,
    // aplikasi mobile tetap hidup lewat refresh token yang berlaku 30 hari.
    if (data.status === 'inactive' && target.status !== 'inactive') {
      await revokeAllUserRefreshTokens(id);
    }

    return user;
  };

  export const removeUser = async (id, userContext) => {
    const user = await repo.deleteUser(id, userContext);
    if (!user) throw new AppError('Data pengguna tidak ditemukan atau Anda tidak memiliki akses.', 404);
    return user;
  };
