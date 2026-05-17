// src/modules/companies/company.controller.js
import * as service from './company.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getCompanies();
  return reply.code(200).send({ success: true, message: 'Success', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getCompany(request.params.id);
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createCompany(request.body);
  return reply.code(201).send({ success: true, message: 'Company created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyCompany(request.params.id, request.body);
    return reply.code(200).send({ success: true, message: 'Company updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeCompany(request.params.id);
    return reply.code(200).send({ success: true, message: 'Company deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};