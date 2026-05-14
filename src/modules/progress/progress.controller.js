import * as service from './progress.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getProgressList(request.user, request.query);
  return reply.code(200).send({ success: true, message: 'Success', data });
};

export const getByUnitHandler = async (request, reply) => {
  try {
    const data = await service.getProgressByUnit(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getProgress(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Success', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createProgress(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Progress added', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    const data = await service.modifyProgress(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Progress updated', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const deleteHandler = async (request, reply) => {
  try {
    await service.removeProgress(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Progress deleted', data: {} });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};
