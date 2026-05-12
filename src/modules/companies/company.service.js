// src/modules/companies/company.service.js
import * as repo from './company.repository.js';

export const getCompanies = async () => {
  return await repo.findAllCompanies();
};

export const getCompany = async (id) => {
  const company = await repo.findCompanyById(id);
  if (!company) throw new Error('Company not found');
  return company;
};

export const createCompany = async (data) => {
  return await repo.insertCompany(data);
};

export const modifyCompany = async (id, data) => {
  const company = await repo.updateCompany(id, data);
  if (!company) throw new Error('Company not found');
  return company;
};

export const removeCompany = async (id) => {
  const company = await repo.deleteCompany(id);
  if (!company) throw new Error('Company not found');
  return company;
};