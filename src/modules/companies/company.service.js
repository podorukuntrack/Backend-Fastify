// src/modules/companies/company.service.js
import * as repo from './company.repository.js';
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';
import { AppError } from '../../shared/utils/AppError.js';

// super_admin & owner memang berwenang lintas perusahaan; admin & direksi tidak.
const isCrossCompanyRole = (userContext) =>
  ['super_admin', 'owner'].includes(userContext?.role);

export const getCompanies = async (userContext) => {
  const all = await repo.findAllCompanies();
  if (isCrossCompanyRole(userContext)) return all;

  // Admin/direksi hanya perlu perusahaannya sendiri — sebelumnya endpoint ini
  // mengembalikan seluruh PT beserta alamat dan logonya ke semua role.
  return all.filter((c) => c.id === userContext?.companyId);
};

export const getCompany = async (id, userContext) => {
  if (!isCrossCompanyRole(userContext) && id !== userContext?.companyId) {
    throw new AppError('Data perusahaan tidak ditemukan.', 404);
  }
  const company = await repo.findCompanyById(id);
  if (!company) throw new AppError('Data perusahaan tidak ditemukan.', 404);
  return company;
};

export const createCompany = async (data) => {
  return await repo.insertCompany(data);
};

export const modifyCompany = async (id, data) => {
  const company = await repo.updateCompany(id, data);
  if (!company) throw new AppError('Data perusahaan tidak ditemukan.', 404);
  return company;
};

export const canDeleteCompany = async (companyId) => {
  // Check for related units via projects
  const unitCountRes = await db.execute(sql`
    SELECT COUNT(*) as count FROM units u
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE p.company_id = ${companyId}::uuid`
  );
  if (Number(unitCountRes[0].count) > 0) return false;
  // Check for related users (excluding super_admins)
  const userCountRes = await db.execute(sql`
    SELECT COUNT(*) as count FROM users WHERE company_id = ${companyId}::uuid`
  );
  if (Number(userCountRes[0].count) > 0) return false;
  // Check for assignments via property_assignments linked to units of this company
  const assignCountRes = await db.execute(sql`
    SELECT COUNT(*) as count FROM property_assignments pa
    JOIN units u ON u.id = pa.unit_id
    JOIN clusters c ON c.id = u.cluster_id
    JOIN projects p ON p.id = c.project_id
    WHERE p.company_id = ${companyId}::uuid`
  );
  if (Number(assignCountRes[0].count) > 0) return false;
  return true;
};

export const removeCompany = async (id) => {
  const canDelete = await canDeleteCompany(id);
  if (!canDelete) throw new AppError('Perusahaan tidak dapat dihapus karena memiliki data terkait.', 409);
  const company = await repo.deleteCompany(id);
  if (!company) throw new AppError('Data perusahaan tidak ditemukan.', 404);
  return company;
};