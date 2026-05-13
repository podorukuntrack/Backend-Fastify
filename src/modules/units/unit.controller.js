import * as service from './unit.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getUnits(request.user, request.query);
  return reply.code(200).send({ success: true, message: 'Units retrieved', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getUnit(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Unit retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const getDetailHandler = async (request, reply) => {
  try {
    const data = await service.getUnitDetail(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Unit detail retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  const data = await service.createUnit(request.body, request.user);
  return reply.code(201).send({ success: true, message: 'Unit created', data });
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyUnit(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Unit updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const bulkCreateHandler = async (request, reply) => {
  const data = await service.createUnits(request.body, request.user);
  return reply.code(201).send({ success: true, message: 'Units created', data });
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeUnit(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Unit deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};