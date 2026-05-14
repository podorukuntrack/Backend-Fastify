// src/modules/companies/company.repository.js
import { db } from '../../config/database.js';
import { sql } from 'drizzle-orm';

export const findAllCompanies = async () => {
  return await db.execute(sql`
    SELECT id, nama_pt, kode_pt, alamat, logo_url, created_at, updated_at
      FROM companies
     ORDER BY created_at DESC
  `);
};

export const findCompanyById = async (id) => {
  const result = await db.execute(sql`
    SELECT id, nama_pt, kode_pt, alamat, logo_url, created_at, updated_at
      FROM companies
     WHERE id = ${id}
     LIMIT 1
  `);
  return result[0];
};

export const insertCompany = async (data) => {
  const namaPt = data.nama_pt ?? data.name;
  const kodePt = data.kode_pt ?? namaPt?.slice(0, 12)?.toUpperCase()?.replace(/\s+/g, '_');

  const result = await db.execute(sql`
    INSERT INTO companies (nama_pt, kode_pt, alamat, logo_url)
    VALUES (${namaPt}, ${kodePt}, ${data.alamat ?? null}, ${data.logo_url ?? null})
    RETURNING id, nama_pt, kode_pt, alamat, logo_url, created_at, updated_at
  `);
  return result[0];
};

export const updateCompany = async (id, data) => {
  const result = await db.execute(sql`
    UPDATE companies
       SET nama_pt = COALESCE(${data.nama_pt ?? data.name ?? null}, nama_pt),
           kode_pt = COALESCE(${data.kode_pt ?? null}, kode_pt),
           alamat = COALESCE(${data.alamat ?? null}, alamat),
           logo_url = COALESCE(${data.logo_url ?? null}, logo_url),
           updated_at = NOW()
     WHERE id = ${id}
    RETURNING id, nama_pt, kode_pt, alamat, logo_url, created_at, updated_at
  `);
  return result[0];
};

export const deleteCompany = async (id) => {
  const result = await db.execute(sql`
    DELETE FROM companies
     WHERE id = ${id}
    RETURNING id
  `);
  return result[0];
};
