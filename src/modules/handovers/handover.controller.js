import * as service from './handover.service.js';

export const getAllHandler = async (request, reply) => {
  const data = await service.getHandovers(request.user, request.query);
  return reply.code(200).send({ success: true, message: 'Handovers retrieved', data });
};

export const getByIdHandler = async (request, reply) => {
  try {
    const data = await service.getHandover(request.params.id, request.user);
    return reply.code(200).send({ success: true, message: 'Handover retrieved', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createHandler = async (request, reply) => {
  try {
    const data = await service.createHandover(request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Handover scheduled', data });
  } catch (error) {
    return reply.code(403).send({ success: false, message: error.message, errors: [] });
  }
};

export const updateHandler = async (request, reply) => {
  try {
    console.log('[PATCH handover] id:', request.params.id, 'body:', JSON.stringify(request.body));
    const data = await service.modifyHandover(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Handover updated', data });
  } catch (error) {
    console.error('[PATCH handover] ERROR:', error.message, error.stack);
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const createDefectHandler = async (request, reply) => {
  try {
    const data = await service.reportDefect(request.params.id, request.body, request.user);
    return reply.code(201).send({ success: true, message: 'Defect reported', data });
  } catch (error) {
    return reply.code(404).send({ success: false, message: error.message, errors: [] });
  }
};

export const respondHandler = async (request, reply) => {
  try {
    const data = await service.modifyHandover(request.params.id, request.body, request.user);
    return reply.code(200).send({ success: true, message: 'Handover response saved', data });
  } catch (error) {
    return reply.code(400).send({ success: false, message: error.message, errors: [] });
  }
};

export const confirmHandler = async (request, reply) => {
  try {
    const data = await service.modifyHandover(request.params.id, { status: 'selesai' }, request.user);
    return reply.code(200).send({ success: true, message: 'Handover confirmed completed', data });
  } catch (error) {
    return reply.code(400).send({ success: false, message: error.message, errors: [] });
  }
};