import * as service from './retention.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getRetentionsList(request.user, request.query);
  return reply.code(200).send({ success: true, message: 'Retentions retrieved', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getRetentionDetail(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Retention retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createRetention(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Retention recorded', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyRetention(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Retention updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeRetention(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Retention deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};